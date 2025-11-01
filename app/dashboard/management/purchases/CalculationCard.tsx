
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";

interface CalculationCardProps {
  subtotal: number;
  vat: number;
  tcs: number;
  grandTotal: number;
}

export function CalculationCard({ subtotal, vat, tcs, grandTotal }: CalculationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Amount Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">VAT (35%)</span>
          <span className="font-medium text-warning">₹{vat.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">TCS (1%)</span>
          <span className="font-medium text-accent">₹{tcs.toFixed(2)}</span>
        </div>
        <Separator />
        <div className="flex justify-between">
          <span className="font-semibold">Grand Total</span>
          <span className="font-bold text-lg text-primary">₹{grandTotal.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
