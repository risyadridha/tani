# scripts/api-smoke.ps1 — uji asap API Sprint 4 (butuh server + MySQL + seed).
# Run: powershell -File scripts/api-smoke.ps1 -Base http://localhost:3101
param([string]$Base = "http://localhost:3101")
$T = "$env:TEMP\tanihub-qa"
New-Item -ItemType Directory -Force -Path $T | Out-Null
$script:fail = 0
function Req($label, $method, $url, $jar, $bodyFile, $expect, $match) {
  $args = @("-s", "-w", "`n%{http_code}", "-X", $method)
  if ($jar) { $args += @("-b", $jar) }
  if ($bodyFile) { $args += @("-H", "Content-Type: application/json", "--data-binary", "@$bodyFile") }
  $args += $url
  $out = curl.exe @args 2>$null
  $code = [int]($out[-1])
  $body = ($out[0..($out.Length - 2)] -join "")
  $ok = ($code -eq $expect) -and (-not $match -or $body -match $match)
  if ($ok) { "PASS  $label -> $code" } else { $script:fail++; "FAIL  $label -> $code (want $expect) :: $($body.Substring(0, [Math]::Min(150, $body.Length)))" }
}
function J($name, $content) { $p = "$T\$name"; Set-Content -LiteralPath $p -Value $content -NoNewline; return $p }
$jarF = "$T\farmer.jar"; $jarB = "$T\buyer.jar"
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$buyerEmail = "qa-buyer-$stamp@tani.id"
$regBody = J "reg.json" (@{ name = "QA Buyer"; email = $buyerEmail; password = "Kuat1234" } | ConvertTo-Json)

Req "register buyer" POST "$Base/api/auth/register" "" $regBody 201 '"role":"buyer"'
Req "login farmer" POST "$Base/api/auth/login" "" (J "flog.json" '{"email":"farmer-1@seed.local","password":"TaniSeed123"}') 200 '"role":"farmer"'
# (login ulang untuk jar agar sesi tersimpan)
curl.exe -s -c $jarF -H "Content-Type: application/json" --data-binary "@$T\flog.json" "$Base/api/auth/login" | Out-Null
$blogBody = J "blog.json" (@{ email = $buyerEmail; password = "Kuat1234" } | ConvertTo-Json)
curl.exe -s -c $jarB -H "Content-Type: application/json" --data-binary "@$blogBody" "$Base/api/auth/login" | Out-Null
Req "me authed" GET "$Base/api/auth/me" $jarF "" 200 '"email":"farmer-1@seed.local"'
Req "products list" GET "$Base/api/products?limit=3" "" "" 200 '"total":'
Req "products filter+sort" GET "$Base/api/products?category=Buah&sort=termurah&limit=2" "" "" 200 'prod-5'
Req "products bad limit" GET "$Base/api/products?limit=9999" "" "" 400 ""
Req "products 404" GET "$Base/api/products/nope" "" "" 404 '"NOT_FOUND"'
Req "inventory noauth" GET "$Base/api/inventory" "" "" 401 ""
Req "orders noauth" GET "$Base/api/orders" "" "" 401 ""
$np = Req "product create" POST "$Base/api/products" $jarF (J "np.json" '{"name":"QA Tomat","category":"Sayuran","description":"Tomat QA minimal sepuluh karakter.","grade":"A","price":9000,"unit":"kg","minOrder":5,"stock":40,"location":"Bogor","status":"active"}') 201 '"id"'
$prodId = (curl.exe -s -b $jarF "$Base/api/products?q=QA+Tomat&limit=1" | ConvertFrom-Json).data[0].id
"INFO  test product = $prodId"
Req "cross-farmer patch" PATCH "$Base/api/products/prod-2" $jarF (J "p1.json" '{"price":1}') 404 '"NOT_FOUND"'
Req "negative price" PATCH "$Base/api/products/$prodId" $jarF (J "p2.json" '{"price":-5}') 422 ""
Req "inventory adjust" POST "$Base/api/inventory/$prodId/adjust" $jarF (J "a1.json" '{"delta":-5,"reason":"QA adjust","kind":"ADJUSTMENT"}') 200 '"stock":35'
Req "inventory overdraw" POST "$Base/api/inventory/$prodId/adjust" $jarF (J "a2.json" '{"delta":-1000,"reason":"QA overdraw","kind":"ADJUSTMENT"}') 409 '"CONFLICT"'
Req "inventory history" GET "$Base/api/inventory/$prodId" $jarF "" 200 'INITIAL'
# order: buyer beli 5 (stok 35) -> idempotency -> overstock -> transisi ilegal
$ob = J "ob.json" (@{ lines = @(@{ productId = $prodId; quantity = 5 }); address = @{ fullName = "QA Buyer"; phone = "081234567890"; email = ""; province = "Jabar"; city = "Bogor"; district = "X"; village = "Y"; address = "Jalan QA nomor 123 lengkap"; postalCode = "16111" }; courier = "jne"; courierService = "REG"; paymentMethod = "va"; idempotencyKey = "qa-key-$stamp-001" } | ConvertTo-Json -Depth 5)
Req "order create" POST "$Base/api/orders" $jarB $ob 201 '"orderIds"'
Req "order idempotent" POST "$Base/api/orders" $jarB $ob 200 '"deduped":true'
$ob2 = J "ob2.json" (@{ lines = @(@{ productId = $prodId; quantity = 100 }); address = @{ fullName = "QA Buyer"; phone = "081234567890"; email = ""; province = "Jabar"; city = "Bogor"; district = "X"; village = "Y"; address = "Jalan QA nomor 123 lengkap"; postalCode = "16111" }; courier = "jne"; courierService = "REG"; paymentMethod = "va"; idempotencyKey = "qa-key-$stamp-002" } | ConvertTo-Json -Depth 5)
Req "order overstock" POST "$Base/api/orders" $jarB $ob2 409 'INSUFFICIENT_STOCK'
$oid = (curl.exe -s -b $jarB "$Base/api/orders?limit=1" | ConvertFrom-Json).data[0].id
"INFO  test order = $oid"
Req "order illegal jump" PATCH "$Base/api/orders/$oid/status" $jarF (J "s1.json" '{"to":"shipped"}') 403 ""
Req "order confirm" PATCH "$Base/api/orders/$oid/status" $jarF (J "s2.json" '{"to":"confirmed"}') 200 '"confirmed"'
Req "buyer forbidden trans" PATCH "$Base/api/orders/$oid/status" $jarB (J "s3.json" '{"to":"processing"}') 403 ""
Req "pay own order" POST "$Base/api/orders/$oid/pay" $jarB "" 200 '"paid"'
Req "pay twice" POST "$Base/api/orders/$oid/pay" $jarB "" 409 ""
Req "farmer inbox" GET "$Base/api/farmer/orders?actionOnly=true" $jarF "" 200 '"farmerId":"farmer-1"'
Req "order detail buyer" GET "$Base/api/orders/$oid" $jarB "" 200 '"trackingNumber"'
# seller application: buyer draft -> submit -> admin approve -> farmer role
Req "app draft" POST "$Base/api/seller/applications" $jarB (J "ap.json" '{"fullName":"QA Buyer","phone":"081234567890","location":"Bogor","farmName":"Kebun QA","farmLocation":"Bogor","commodities":"Sayuran","description":"Kebun QA untuk pengujian integrasi."}') 201 '"status":"draft"'
$appId = (curl.exe -s -b $jarB "$Base/api/seller/applications" | ConvertFrom-Json).data[0].id
"INFO  test app = $appId"
Req "app submit" POST "$Base/api/seller/applications/$appId/submit" $jarB "" 200 '"under_review"'
curl.exe -s -c "$T\admin.jar" -H "Content-Type: application/json" --data-binary "@$(J "alog.json" '{"email":"admin@tanihub.id","password":"TaniSeed123"}')" "$Base/api/auth/login" | Out-Null
Req "admin approve" PATCH "$Base/api/seller/applications/$appId/review" "$T\admin.jar" (J "apr.json" '{"approved":true}') 200 '"farmerId"'
Req "promoted can create" POST "$Base/api/products" $jarB (J "np2.json" '{"name":"QA Kol","category":"Sayuran","description":"Kol QA minimal sepuluh karakter.","grade":"A","price":5000,"unit":"kg","minOrder":2,"stock":10,"location":"Bogor","status":"draft"}') 201 '"id"'
$kolId = (curl.exe -s -b $jarB "$Base/api/products?mine=true&limit=50" | ConvertFrom-Json).data | Where-Object { $_.name -eq "QA Kol" } | Select-Object -First 1 -ExpandProperty id
Req "delete history-only" DELETE "$Base/api/products/$kolId" $jarB "" 409 'riwayat'
Req "delete with history" DELETE "$Base/api/products/$prodId" $jarF "" 409 '"CONFLICT"'
""
if ($script:fail -eq 0) { "ALL PASS" } else { "$($script:fail) FAILURES" }
exit $script:fail
