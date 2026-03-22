import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Percent, ShoppingBag, Building2, Package, Layers } from "lucide-react";
import WholesaleDiscountsTab from "./WholesaleDiscountsTab";
import QuantityTiersTab from "./QuantityTiersTab";
import CouponsTab from "./CouponsTab";
import ShippingRulesTab from "./ShippingRulesTab";
import RetailDiscountsTab from "./RetailDiscountsTab";
import BundleDiscountsTab from "./BundleDiscountsTab";
import StackingRulesTab from "./StackingRulesTab";

const DiscountsTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <Percent className="h-5 w-5 text-primary" />
          Discount Management
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Manage wholesale and retail discounts separately. Each type applies only to its respective customer group.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="wholesale" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-11">
            <TabsTrigger value="wholesale" className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              Wholesale
            </TabsTrigger>
            <TabsTrigger value="retail" className="gap-1.5 text-xs">
              <ShoppingBag className="h-3.5 w-3.5" />
              Retail
            </TabsTrigger>
            <TabsTrigger value="bundles" className="gap-1.5 text-xs">
              <Package className="h-3.5 w-3.5" />
              Bundles
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-1.5 text-xs">
              <Layers className="h-3.5 w-3.5" />
              Rules
            </TabsTrigger>
          </TabsList>

          {/* ─── Wholesale Discounts ─── */}
          <TabsContent value="wholesale">
            <Tabs defaultValue="w-discounts" className="space-y-4">
              <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/60">
                <TabsTrigger value="w-discounts" className="text-xs">Product / Publisher / Category</TabsTrigger>
                <TabsTrigger value="w-qty" className="text-xs">Quantity Tiers</TabsTrigger>
                <TabsTrigger value="w-coupons" className="text-xs">Coupons</TabsTrigger>
                <TabsTrigger value="w-shipping" className="text-xs">Shipping Rules</TabsTrigger>
              </TabsList>

              <TabsContent value="w-discounts">
                <WholesaleDiscountsTab />
              </TabsContent>
              <TabsContent value="w-qty">
                <QuantityTiersTab />
              </TabsContent>
              <TabsContent value="w-coupons">
                <CouponsTab wholesaleOnly />
              </TabsContent>
              <TabsContent value="w-shipping">
                <ShippingRulesTab wholesaleOnly />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ─── Retail Discounts ─── */}
          <TabsContent value="retail">
            <Tabs defaultValue="r-discounts" className="space-y-4">
              <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/60">
                <TabsTrigger value="r-discounts" className="text-xs">Product / Category</TabsTrigger>
                <TabsTrigger value="r-coupons" className="text-xs">Coupons</TabsTrigger>
                <TabsTrigger value="r-shipping" className="text-xs">Shipping Rules</TabsTrigger>
              </TabsList>

              <TabsContent value="r-discounts">
                <RetailDiscountsTab />
              </TabsContent>
              <TabsContent value="r-coupons">
                <CouponsTab retailOnly />
              </TabsContent>
              <TabsContent value="r-shipping">
                <ShippingRulesTab retailOnly />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ─── Bundle Discounts ─── */}
          <TabsContent value="bundles">
            <BundleDiscountsTab />
          </TabsContent>

          {/* ─── Stacking Rules ─── */}
          <TabsContent value="rules">
            <StackingRulesTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DiscountsTab;
