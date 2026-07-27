import ProductFacetManager from "./product-facet-manager";
import VariantManager from "./variant-manager";
import BrandManager from "./brand-manager";
import UnitManager from "./unit-manager";

export default function EntityManager({ kind }: { kind: "variations" | "brands" | "units" | "taxes" }) {
  if (kind === "variations") return <VariantManager />;
  if (kind === "brands") return <BrandManager />;
  if (kind === "units") return <UnitManager />;
  return <ProductFacetManager kind={kind} />;
}
