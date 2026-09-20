import { notFound } from "next/navigation";
import { Navbar } from "@/components/tanihub/navbar";
import { Footer } from "@/components/tanihub/footer";
import { ProductDetailContent } from "./product-detail-content";
import { SellerProductResolver } from "./seller-resolver";
import { getProductById, getRelatedProducts, mockProducts } from "@/data/products";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return mockProducts.map((p) => ({ id: p.id }));
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const product = getProductById(id);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-6 pb-12 lg:pt-8 lg:pb-16">
        {product ? (
          <ProductDetailContent
            product={product}
            relatedProducts={getRelatedProducts(product.category, product.id, 4)}
          />
        ) : id.startsWith("my-prod-") ? (
          // Produk seller (client-side) — di-resolve setelah hydration.
          <SellerProductResolver id={id} />
        ) : (
          notFound()
        )}
      </main>
      <Footer />
    </div>
  );
}
