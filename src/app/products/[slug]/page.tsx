import { redirect } from "next/navigation";

interface ProductsRedirectProps {
  params: {
    slug: string;
  };
}

export default function ProductsRedirectPage({ params }: ProductsRedirectProps) {
  redirect(`/product/${params.slug}`);
}
