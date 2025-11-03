import { Purchase } from "@/types/purchase";
import { format } from "date-fns";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../components/ui/pagination";

interface RecentPurchasesTableProps {
  purchases: Purchase[];
}

const ITEMS_PER_PAGE = 5;

export function RecentPurchasesTable({ purchases }: RecentPurchasesTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(purchases.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPurchases = purchases.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Purchase ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">VAT (35%)</TableHead>
              <TableHead className="text-right">TCS (1%)</TableHead>
              <TableHead className="text-right">Grand Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentPurchases.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-8"
                >
                  No purchases yet
                </TableCell>
              </TableRow>
            ) : (
              currentPurchases.map((purchase) => {
                const vatAmount = purchase.subtotal * 0.35;
                const tcsAmount = purchase.subtotal * 1.35 * 0.01;
                const totalAmount =
                  purchase.subtotal + vatAmount + tcsAmount;

                return (
                  <TableRow key={purchase._id}>
                    <TableCell>{purchase._id}</TableCell>
                    <TableCell className="font-medium">
                      {format(
                        new Date(purchase.purchaseDate),
                        "dd/MM/yyyy HH:mm"
                      )}
                    </TableCell>
                    <TableCell>{purchase.vendorName}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {purchase.items.length} item(s)
                        <div className="text-xs text-muted-foreground">
                          {purchase.items
                            .map((item) => item.productName)
                            .join(", ")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{purchase.subtotal.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-warning">
                      ₹{vatAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-warning">
                      ₹{tcsAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      ₹{totalAmount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
