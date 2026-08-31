import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { v4 as uuidv4 } from "uuid";
import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

const emptyProduct = () => ({
  rowId: uuidv4(),
  product_name: "",
  quantity: 1,
  unit_price: 0,
  discount: 0,
});

function NewQuotation() {
  const { user } = useAuth();
  const router = useRouter();

  const [customer, setCustomer] = useState({
    customer_name: "",
    company_name: "",
    email: "",
    phone: "",
  });

  const [quotationMeta, setQuotationMeta] = useState({
    quotation_number: `QT-${Date.now().toString().slice(-6)}`,
    quotation_date: new Date().toISOString().slice(0, 10),
    valid_until: "",
    gst_percent: 18,
  });

  const [products, setProducts] = useState([emptyProduct()]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function updateProduct(rowId, field, value) {
    setProducts((prev) =>
      prev.map((p) => (p.rowId === rowId ? { ...p, [field]: value } : p))
    );
  }

  function addProduct() {
    setProducts((prev) => [...prev, emptyProduct()]);
  }

  function removeProduct(rowId) {
    setProducts((prev) => (prev.length > 1 ? prev.filter((p) => p.rowId !== rowId) : prev));
  }

  // Automatic calculation, recomputed on every render from current state
  const computed = useMemo(() => {
    const rows = products.map((p) => {
      const qty = Number(p.quantity) || 0;
      const price = Number(p.unit_price) || 0;
      const disc = Number(p.discount) || 0;
      const gross = qty * price;
      const discountAmount = gross * (disc / 100);
      const net = gross - discountAmount;
      return { ...p, gross, discountAmount, net };
    });

    const subtotal = rows.reduce((sum, r) => sum + r.net, 0);
    const gstPercent = Number(quotationMeta.gst_percent) || 0;
    const gst = subtotal * (gstPercent / 100);
    const total = subtotal + gst;

    return { rows, subtotal, gst, total };
  }, [products, quotationMeta.gst_percent]);

  function validate() {
    const newErrors = {};
    if (!customer.customer_name.trim()) newErrors.customer_name = "Customer name is required.";
    if (customer.email && !/^\S+@\S+\.\S+$/.test(customer.email)) {
      newErrors.email = "Enter a valid email address.";
    }
    if (!quotationMeta.quotation_date) newErrors.quotation_date = "Quotation date is required.";
    if (products.length === 0) newErrors.products = "At least one product is required.";

    products.forEach((p, idx) => {
      if (!p.product_name.trim()) newErrors[`product_name_${idx}`] = "Required";
      if (!(Number(p.quantity) > 0)) newErrors[`quantity_${idx}`] = "Must be > 0";
      if (Number(p.unit_price) < 0) newErrors[`unit_price_${idx}`] = "Cannot be negative";
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave(e) {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    setSaving(true);
    try {
      const { data: quotation, error: qError } = await supabase
        .from("quotations")
        .insert({
          user_id: user.id,
          quotation_number: quotationMeta.quotation_number,
          customer_name: customer.customer_name,
          company_name: customer.company_name || null,
          email: customer.email || null,
          phone: customer.phone || null,
          quotation_date: quotationMeta.quotation_date,
          valid_until: quotationMeta.valid_until || null,
          subtotal: computed.subtotal,
          gst_percent: Number(quotationMeta.gst_percent) || 0,
          gst: computed.gst,
          total: computed.total,
        })
        .select()
        .single();

      if (qError) throw qError;

      const itemsPayload = computed.rows.map((r) => ({
        quotation_id: quotation.id,
        product_name: r.product_name,
        quantity: Number(r.quantity),
        unit_price: Number(r.unit_price),
        discount: Number(r.discount),
        amount: r.net,
      }));

      const { error: itemsError } = await supabase.from("quotation_items").insert(itemsPayload);
      if (itemsError) throw itemsError;

      router.push(`/quotations/${quotation.id}`);
    } catch (err) {
      setSubmitError(err.message || "Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  }

  const currency = (n) =>
    `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-800 mb-6">New Quotation</h1>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Customer Information */}
          <section className="card p-6">
            <h2 className="font-medium text-slate-700 mb-4">Customer Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Customer Name *</label>
                <input
                  className="input-field"
                  value={customer.customer_name}
                  onChange={(e) => setCustomer({ ...customer, customer_name: e.target.value })}
                />
                {errors.customer_name && (
                  <p className="text-xs text-red-600 mt-1">{errors.customer_name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Company Name</label>
                <input
                  className="input-field"
                  value={customer.company_name}
                  onChange={(e) => setCustomer({ ...customer, company_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  className="input-field"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Phone</label>
                <input
                  className="input-field"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Quotation Information */}
          <section className="card p-6">
            <h2 className="font-medium text-slate-700 mb-4">Quotation Information</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Quotation Number</label>
                <input
                  className="input-field"
                  value={quotationMeta.quotation_number}
                  onChange={(e) =>
                    setQuotationMeta({ ...quotationMeta, quotation_number: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Quotation Date *</label>
                <input
                  type="date"
                  className="input-field"
                  value={quotationMeta.quotation_date}
                  onChange={(e) =>
                    setQuotationMeta({ ...quotationMeta, quotation_date: e.target.value })
                  }
                />
                {errors.quotation_date && (
                  <p className="text-xs text-red-600 mt-1">{errors.quotation_date}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Valid Until</label>
                <input
                  type="date"
                  className="input-field"
                  value={quotationMeta.valid_until}
                  onChange={(e) =>
                    setQuotationMeta({ ...quotationMeta, valid_until: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">GST %</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  value={quotationMeta.gst_percent}
                  onChange={(e) =>
                    setQuotationMeta({ ...quotationMeta, gst_percent: e.target.value })
                  }
                />
              </div>
            </div>
          </section>

          {/* Products */}
          <section className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-slate-700">Products / Services</h2>
              <button type="button" onClick={addProduct} className="btn-secondary text-sm">
                + Add Product
              </button>
            </div>
            {errors.products && <p className="text-xs text-red-600 mb-2">{errors.products}</p>}

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="text-slate-500 text-left">
                  <tr>
                    <th className="py-2 pr-2 font-medium">Product Name</th>
                    <th className="py-2 pr-2 font-medium w-24">Qty</th>
                    <th className="py-2 pr-2 font-medium w-32">Unit Price</th>
                    <th className="py-2 pr-2 font-medium w-24">Discount %</th>
                    <th className="py-2 pr-2 font-medium w-32">Net Amount</th>
                    <th className="py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {computed.rows.map((row, idx) => (
                    <tr key={row.rowId} className="border-t border-slate-100">
                      <td className="py-2 pr-2">
                        <input
                          className="input-field"
                          value={row.product_name}
                          onChange={(e) =>
                            updateProduct(row.rowId, "product_name", e.target.value)
                          }
                          placeholder="e.g. Accounting Software"
                        />
                        {errors[`product_name_${idx}`] && (
                          <p className="text-xs text-red-600 mt-1">
                            {errors[`product_name_${idx}`]}
                          </p>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min="0"
                          className="input-field"
                          value={row.quantity}
                          onChange={(e) => updateProduct(row.rowId, "quantity", e.target.value)}
                        />
                        {errors[`quantity_${idx}`] && (
                          <p className="text-xs text-red-600 mt-1">{errors[`quantity_${idx}`]}</p>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input-field"
                          value={row.unit_price}
                          onChange={(e) =>
                            updateProduct(row.rowId, "unit_price", e.target.value)
                          }
                        />
                        {errors[`unit_price_${idx}`] && (
                          <p className="text-xs text-red-600 mt-1">
                            {errors[`unit_price_${idx}`]}
                          </p>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="input-field"
                          value={row.discount}
                          onChange={(e) => updateProduct(row.rowId, "discount", e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-2 font-medium text-slate-700">
                        {currency(row.net)}
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => removeProduct(row.rowId)}
                          className="text-red-500 text-xs hover:underline"
                          disabled={products.length === 1}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <div className="w-full sm:w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span>{currency(computed.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GST ({quotationMeta.gst_percent || 0}%)</span>
                  <span>{currency(computed.gst)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-800 border-t border-slate-200 pt-1">
                  <span>Grand Total</span>
                  <span>{currency(computed.total)}</span>
                </div>
              </div>
            </div>
          </section>

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.push("/quotations")}
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save Quotation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewQuotationPage() {
  return (
    <ProtectedRoute>
      <NewQuotation />
    </ProtectedRoute>
  );
}
