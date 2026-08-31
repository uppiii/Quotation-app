import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

function QuotationsList() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (user) fetchQuotations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchQuotations() {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("quotations")
      .select("id, quotation_number, customer_name, total, quotation_date")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setQuotations(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this quotation? This cannot be undone.")) return;
    setDeletingId(id);
    const { error: deleteError } = await supabase.from("quotations").delete().eq("id", id);
    setDeletingId(null);

    if (deleteError) {
      alert(deleteError.message);
      return;
    }
    setQuotations((prev) => prev.filter((q) => q.id !== id));
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-slate-800">Quotations</h1>
          <Link href="/quotations/new" className="btn-primary">
            + New Quotation
          </Link>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <p className="p-6 text-slate-500 text-sm">Loading quotations...</p>
          ) : error ? (
            <p className="p-6 text-red-600 text-sm">{error}</p>
          ) : quotations.length === 0 ? (
            <p className="p-6 text-slate-500 text-sm">
              No quotations yet. Create your first one.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Quotation #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {q.quotation_number}
                    </td>
                    <td className="px-4 py-3">{q.customer_name}</td>
                    <td className="px-4 py-3">{q.quotation_date}</td>
                    <td className="px-4 py-3">
                      ₹{Number(q.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Link href={`/quotations/${q.id}`} className="btn-secondary text-sm">
                        View
                      </Link>
                      <button
                        onClick={() => handleDelete(q.id)}
                        disabled={deletingId === q.id}
                        className="btn-danger"
                      >
                        {deletingId === q.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuotationsPage() {
  return (
    <ProtectedRoute>
      <QuotationsList />
    </ProtectedRoute>
  );
}
