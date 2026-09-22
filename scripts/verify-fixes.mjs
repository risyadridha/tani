// Regression checks for audit findings #1-#12 (static, read-only).
// Run: node scripts/verify-fixes.mjs
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
let pass = 0;
let fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`); }
};

// #1 dead routes: global not-found + no app link to missing route without stub
check("#1 not-found.tsx exists", existsSync(join(root, "src/app/not-found.tsx")));
const stubRoutes = [
  "src/app/pesanan/page.tsx",
  "src/app/permintaan/page.tsx",
  "src/app/harga-pasar/page.tsx",
  "src/app/edukasi/page.tsx",
  "src/app/menjual/page.tsx",
];
for (const r of stubRoutes) check(`#1 stub ${r}`, existsSync(join(root, r)));

// #2 pesanan + no hard reload to /pesanan
check("#2 /pesanan page exists", existsSync(join(root, "src/app/pesanan/page.tsx")));
check(
  "#2 checkout success uses router (no window.location.href=\"/pesanan\")",
  !read("src/app/checkout/page.tsx").includes('window.location.href = "/pesanan"')
);

// #3 empty-cart guard
check(
  "#3 checkout guards empty cart",
  /items\.length\s*===\s*0/.test(read("src/app/checkout/page.tsx"))
);

// #4 bank options separated from method RadioGroup
{
  const src = read("src/app/checkout/page.tsx");
  const methodBlock = src.slice(
    src.indexOf('watch("method")'),
    src.indexOf('watch("method")') + 2000
  );
  check("#4 bank items not inside method RadioGroup", !methodBlock.includes("value={bank}"));
}

// #5 PDP resolves dari API (migrasi Sprint 4: bukan generateStaticParams mock)
check(
  "#5 product detail fetches from API",
  read("src/app/produk/[id]/page.tsx").includes("/api/products/") &&
    !read("src/app/produk/[id]/page.tsx").includes("mockProducts")
);

// #6 no history spam
{
  const src = read("src/app/marketplace/marketplace-content.tsx");
  check("#6 filter sync uses router.replace", src.includes("router.replace"));
  check(
    "#6 no router.push in filter sync",
    !/router\.push\(`\/marketplace\?/.test(src)
  );
}

// #7 live validation + awaited trigger
{
  const src = read("src/app/checkout/page.tsx");
  check("#7 forms use live validation mode", /mode:\s*"on(Touched|Change|Blur)"/.test(src));
  check("#7 handleNext awaits trigger", /await\s+\w+Form\.trigger\(\)/.test(src));
}

// #8 dead buttons wired
{
  const detail = read("src/app/produk/[id]/product-detail-content.tsx");
  const nav = read("src/components/tanihub/navbar.tsx");
  const foot = read("src/components/tanihub/footer.tsx");
  check("#8 wishlist has handler", /Heart[\s\S]{0,400}?onClick|onClick[\s\S]{0,200}?[Ww]ishlist|isWished/.test(detail));
  check("#8 share has handler", detail.includes("navigator.clipboard") || /Share[\s\S]{0,300}?onClick|onClick[\s\S]{0,200}?[Ss]hare/.test(detail));
  check("#8 navbar cart opens cart", (nav.match(/openCart|toggleCart|setShowCart|router\.push\("\/checkout"\)/g) || []).length >= 1);
  check("#8 newsletter prevents reload", foot.includes("preventDefault"));
}

// #9 step multiples enforced
check(
  "#9 QuantitySelector rounds to step",
  read("src/components/tanihub/quantity-selector.tsx").includes("Math.round")
);

// #10 fresh data + honest SEO
{
  const products = read("src/data/products.ts");
  const layout = read("src/app/layout.tsx");
  check("#10 no 2024 harvest dates", !products.includes('"2024-'));
  check("#10 no fake google verification", !layout.includes("google-site-verification-code"));
  check(
    "#10 og image honest (asset exists or no dangling ref)",
    !layout.includes("/og-image.jpg") || existsSync(join(root, "public/og-image.jpg"))
  );
}

// #12 single formatCurrency
{
  const card = read("src/components/tanihub/product-card.tsx");
  check(
    "#12 product-card reuses lib formatCurrency",
    card.includes("formatCurrency") &&
      !card.includes("function formatCurrency") &&
      /import\s*\{[^}]*formatCurrency[^}]*\}\s*from\s*"@\/lib\/utils"/.test(card)
  );
}

// Product detail gallery + tabs
{
  const detail = read("src/app/produk/[id]/product-detail-content.tsx");
  check("gallery resets on product change", /\[product\.id/.test(detail));
  check("gallery never renders empty/broken image", detail.includes("Gambar tidak tersedia"));
  check("tabs scroll compactly on mobile", detail.includes("overflow-x-auto"));
  const products = read("src/data/products.ts");
  const prod1 = products.slice(products.indexOf('id: "prod-1"'), products.indexOf('id: "prod-2"'));
  check(
    "prod-1 images replaced (chili + farm)",
    prod1.includes("photo-1583119912267-cc97c911e416") &&
      prod1.includes("photo-1625246333195-78d9c38ad449")
  );
}

// Product tabs redesign
{
  const detail = read("src/app/produk/[id]/product-detail-content.tsx");
  check("tabs use line variant", detail.includes('variant="line"'));
  check("tabs stack vertically (flex-col)", /<Tabs[^>]*flex-col/.test(detail));
  check("penjual buttons wired", detail.includes("`/chat/${product.farmerId}?product=${product.id}`"));
}

// No Select/Input may boot with `undefined` value (Base UI useControlled warning)
{
  const files = [
    "src/app/menjual/page.tsx",
    "src/components/tanihub/seller-product-form.tsx",
    "src/app/checkout/page.tsx",
  ];
  for (const f of files) {
    let src = "";
    try { src = read(f); } catch { continue; }
    check(
      `controlled Select in ${f}`,
      /<Select[\s\S]*?value=\{/.test(src) && /<Select[\s\S]*?onValueChange=\{/.test(src)
    );
  }
}

// Sprint 2 — order domain & integration (static guards)
{
  const domain = read("src/data/order.ts");
  check("order machine centralized (canTransitionOrderStatus)", domain.includes("canTransitionOrderStatus"));
  check("order machine forbids completed->processing", !/completed:\s*\[[^\]]*processing/.test(domain));
  check("order machine forbids cancelled transitions", /cancelled:\s*\[\]/.test(domain));
  check("actor split farmer/buyer exists", domain.includes("FARMER_TRANSITIONS") && domain.includes("BUYER_TRANSITIONS"));
  check("order snapshots documented", domain.includes("Snapshot") || domain.includes("snapshot"));
  const store = read("src/store/orders.ts");
  check("single order store (no duplicate)", !/create<OrderStore|useOrderStore2|orders-v1/.test(store));
  check("idempotency key checked", read("src/lib/server/services/order-service.ts").includes("idempotency"));
  check("validate-before-mutate in createOrders", (() => {
    const svc = read("src/lib/server/services/order-service.ts");
    return svc.indexOf("validateOrderLine") < svc.indexOf("INSERT INTO orders");
  })());
  check("legacy migration exists", store.includes("claimDemoOrders"));
  check("like wildcards escaped", read("src/lib/server/repositories/product-repository.ts").includes("escapeLike"));  check("checkout wires handleSubmit to Bayar button", read("src/app/checkout/page.tsx").includes("onClick={() => void handleSubmit()}"));
  check("checkout preserves cart on failure", read("src/app/checkout/page.tsx").includes("setSubmitError"));
  check("checkout groups per farmer", read("src/app/checkout/page.tsx").includes("farmerId"));
  check("buyer detail route exists", existsSync(join(root, "src/app/pesanan/[id]/page.tsx")));
  check("farmer inbox route exists", existsSync(join(root, "src/app/dashboard/pesanan/page.tsx")));
  check("timeline honest (no fake AI)", !/AI-powered|AI MAGIC/i.test(read("src/app/pesanan/[id]/page.tsx")));
  check("mysql schema present", existsSync(join(root, "docs/mysql-schema.sql")));
  check("mysql money = INT UNSIGNED", /price\s+INT UNSIGNED/.test(read("docs/mysql-schema.sql")));
  check("mysql history preserved (orders RESTRICT)", /CONSTRAINT fk_orders_buyer[\s\S]{0,200}?ON DELETE RESTRICT/.test(read("docs/mysql-schema.sql")));
}

// Sprint 3 — auth backend & identity (static guards)
{
  check("auth register route exists", existsSync(join(root, "src/app/api/auth/register/route.ts")));
  check("auth login route exists", existsSync(join(root, "src/app/api/auth/login/route.ts")));
  check("auth logout route exists", existsSync(join(root, "src/app/api/auth/logout/route.ts")));
  check("auth me route exists", existsSync(join(root, "src/app/api/auth/me/route.ts")));
  const reg = read("src/app/api/auth/register/route.ts");
  check("register hashes password", reg.includes("hashPassword") && !reg.includes("passwordHash: parsed"));
  check("register atomic unique insert", reg.includes("insertUnique") || read("src/lib/server/repositories/user-repository.ts").includes("ER_DUP_ENTRY"));
  const login = read("src/app/api/auth/login/route.ts");
  check("login generic error (no enumeration)", login.includes("INVALID_CREDENTIALS") && !login.includes("EMAIL_NOT_FOUND"));
  check("login rate limited", login.includes("isRateLimited"));
  check("session httpOnly cookie", read("src/lib/server/session.ts").includes("httpOnly: true"));
  check("session stores hash not token", read("src/lib/server/session.ts").includes("tokenHash"));
  check("no password in safe user", !read("src/lib/server/auth-helpers.ts").includes("passwordHash"));
  check("auth store not persisted (server authority)", !read("src/store/auth.ts").includes("persist("));
  check("checkout requires login", read("src/app/checkout/page.tsx").includes("returnTo=%2Fcheckout") || read("src/app/checkout/page.tsx").includes("returnTo"));
  check("login/register pages exist", existsSync(join(root, "src/app/login/page.tsx")) && existsSync(join(root, "src/app/register/page.tsx")));
  check("env example documents secrets", existsSync(join(root, ".env.example")));
}

// Sprint 4 — apiFetch mengembalikan body UTUH ({ data, meta? }); call site
// wajib unwrap res.data. Mencegah regresi kontrak ganda.
{
  const api = read("src/lib/api.ts");
  check("apiFetch returns full body", api.includes("return body as T"));
  const bad = [];
  for (const f of [
    "src/app/produk/[id]/page.tsx",
    "src/app/kelola-produk/[id]/edit/page.tsx",
    "src/app/pesanan/[id]/page.tsx",
    "src/app/checkout/page.tsx",
  ]) {
    const src = read(f);
    // Pola salah: generic tanpa wrapper { data } padahal akses .data/.orderIds.
    if (/api(Fetch|Post|Patch)<(?!{)/.test(src)) bad.push(f);
  }
  check("no unwrapped apiFetch generics", bad.length === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);