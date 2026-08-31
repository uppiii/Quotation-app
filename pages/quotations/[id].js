import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabaseClient";

function ViewQuotation() {
  const router = useRouter();
  const { id } = router.query;

  const [quotation, setQuotation] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) fetchQuotation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchQuotation() {
    setLoading(true);
    setError("");

    const { data: q, error: qError } = await supabase
      .from("quotations")
      .select("*")
      .eq("id", id)
      .single();

    if (qError) {
      setError(qError.message);
      setLoading(false);
      return;
    }

    const { data: i, error: iError } = await supabase
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", id);

    if (iError) {
      setError(iError.message);
      setLoading(false);
      return;
    }

    setQuotation(q);
    setItems(i || []);
    setLoading(false);
  }

  const currency = (n) =>
    `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link href="/quotations" className="text-sm text-brand-600 hover:underline">
            &larr; Back to Quotations
          </Link>
          {quotation && (
            <button onClick={() => window.print()} className="btn-secondary">
              Print
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm">Loading quotation...</p>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : !quotation ? (
          <p className="text-slate-500 text-sm">Quotation not found.</p>
        ) : (
          <div className="card p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-xl font-semibold text-slate-800">Quotation</h1>
                <p className="text-sm text-slate-500">#{quotation.quotation_number}</p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>Date: {quotation.quotation_date}</p>
                {quotation.valid_until && <p>Valid Until: {quotation.valid_until}</p>}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <div>
                <h2 className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                  Customer Details
                </h2>
                <p className="font-medium text-slate-800">{quotation.customer_name}</p>
                {quotation.company_name && (
                  <p className="text-sm text-slate-600">{quotation.company_name}</p>
                )}
                {quotation.email && <p className="text-sm text-slate-600">{quotation.email}</p>}
                {quotation.phone && <p className="text-sm text-slate-600">{quotation.phone}</p>}
              </div>
            </div>

            <table className="w-full text-sm mb-6">
              <thead className="text-slate-500 text-left border-b border-slate-200">
                <tr>
                  <th className="py-2 font-medium">Product</th>
                  <th className="py-2 font-medium text-right">Qty</th>
                  <th className="py-2 font-medium text-right">Unit Price</th>
                  <th className="py-2 font-medium text-right">Discount</th>
                  <th className="py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-2">{item.product_name}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{currency(item.unit_price)}</td>
                    <td className="py-2 text-right">{item.discount}%</td>
                    <td className="py-2 text-right font-medium">{currency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-full sm:w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span>{currency(quotation.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GST ({quotation.gst_percent}%)</span>
                  <span>{currency(quotation.gst)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-800 border-t border-slate-200 pt-1 text-base">
                  <span>Grand Total</span>
                  <span>{currency(quotation.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ViewQuotationPage() {
  return (
    <ProtectedRoute>
      <ViewQuotation />
    </ProtectedRoute>
  );
}
