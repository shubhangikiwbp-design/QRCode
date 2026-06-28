import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { ptApi, inr } from "@/lib/ptApi";
import { toast } from "sonner";
import { Plus, Pencil, Trash, ArrowsClockwise, X, MagnifyingGlass, FloppyDisk } from "@phosphor-icons/react";

/* ---------------- Defaults ---------------- */
const EMPTY_OWNER = {
  name_en_first: "", name_en_middle: "", name_en_last: "",
  name_mr_title: "", name_mr_first: "", name_mr_middle: "", name_mr_last: "",
  organization: "", mobile: "", email: "", aadhaar: "", pan: "",
  gender: "", owner_type: "Primary",
};

const EMPTY_UNIT = {
  floor: "", flat_no: "", standard_rate: "", manual_area: "",
  usage_type_id: "", usage_sub_type: "", construction_class_id: "",
  open_plot: "no", occupancy_type: "", assessment_date: "",
  flat_status: "Active",
  carpet_area: "", assessable_area: "", annual_area: "",
};

const EMPTY_PROP = {
  // engine-required (kept)
  property_no: "", owner_name: "", address: "", mobile: "",
  ward_id: "", zone_id: "", construction_type_id: "", usage_type_id: "",
  carpet_area_sqm: "", year_built: new Date().getFullYear() - 5,

  // Section 1 — Property Details
  reference_property_no: "", property_old_no: "", manual_property_no: "",
  sequence_no: "", property_status: "data_entry", status: "new",
  administrative_boundaries: "", revenue_boundaries: "",
  generate_special_notice: false,

  // Section 3 — Location & Usage
  city_survey_no: "", plot_number: "", part_hissa_number: "",
  property_type: "", property_sub_type: "",
  flat_house_no: "", house_apartment_name: "", street_road: "",
  property_usage_type: "", property_usage_sub_type: "",
  area_locality: "", landmark: "", pin_code: "",
  bill_type: "annual", delivery_type: "post",
  current_assessment: "", first_assessment: "", re_assessment: "", last_assessment: "",
  property_description: "",

  // Children
  owners: [],
  units: [],
};

/* ---------------- Reusable bits ---------------- */
function Section({ index, title, children, hint }) {
  return (
    <section className="bg-white border border-zinc-200 mt-6">
      <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#0EA5E9] text-white flex items-center justify-center font-mono text-xs">{index}</div>
          <div>
            <div className="mono-label">{hint || "SECTION"}</div>
            <h3 className="font-heading font-bold text-base">{title}</h3>
          </div>
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

const Field = ({ label, required, children }) => (
  <div>
    <label className="mono-label block mb-1">{label}{required && <span className="text-[#FF4500]"> *</span>}</label>
    {children}
  </div>
);

const Input = (props) => (
  <input {...props} className={`w-full border border-zinc-300 px-3 py-2 bg-white focus:outline-none focus:border-black ${props.className || ""}`} />
);

const Select = (props) => (
  <select {...props} className={`w-full border border-zinc-300 px-3 py-2 bg-white ${props.className || ""}`}>
    {props.children}
  </select>
);

/* ---------------- Owners sub-form ---------------- */
function OwnersBlock({ owners, setOwners }) {
  const [o, setO] = useState(EMPTY_OWNER);
  const set = (k, v) => setO((x) => ({ ...x, [k]: v }));
  const add = () => {
    if (!o.name_en_first && !o.name_en_last) return toast.error("Owner name required");
    setOwners([...owners, { ...o, id: crypto.randomUUID() }]);
    setO(EMPTY_OWNER);
  };
  const del = (id) => setOwners(owners.filter((x) => x.id !== id));

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="First Name (EN)" required><Input value={o.name_en_first} onChange={(e) => set("name_en_first", e.target.value)} data-testid="owner-en-first" /></Field>
        <Field label="Middle Name (EN)"><Input value={o.name_en_middle} onChange={(e) => set("name_en_middle", e.target.value)} data-testid="owner-en-middle" /></Field>
        <Field label="Last Name (EN)" required><Input value={o.name_en_last} onChange={(e) => set("name_en_last", e.target.value)} data-testid="owner-en-last" /></Field>

        <Field label="मालिक शीर्षक (Title MR)"><Input value={o.name_mr_title} onChange={(e) => set("name_mr_title", e.target.value)} placeholder="श्री / श्रीमती / कु." data-testid="owner-mr-title" /></Field>
        <Field label="नाव (MR)"><Input value={o.name_mr_first} onChange={(e) => set("name_mr_first", e.target.value)} data-testid="owner-mr-first" /></Field>
        <Field label="आडनाव (MR)"><Input value={o.name_mr_last} onChange={(e) => set("name_mr_last", e.target.value)} data-testid="owner-mr-last" /></Field>

        <Field label="Organization"><Input value={o.organization} onChange={(e) => set("organization", e.target.value)} data-testid="owner-org" /></Field>
        <Field label="Mobile Number"><Input type="tel" value={o.mobile} onChange={(e) => set("mobile", e.target.value)} data-testid="owner-mobile" /></Field>
        <Field label="Email ID"><Input type="email" placeholder="someone@example.com" value={o.email} onChange={(e) => set("email", e.target.value)} data-testid="owner-email" /></Field>

        <Field label="Aadhaar No."><Input maxLength={12} value={o.aadhaar} onChange={(e) => set("aadhaar", e.target.value.replace(/\D/g, ""))} data-testid="owner-aadhaar" /></Field>
        <Field label="PAN No."><Input maxLength={10} value={o.pan} onChange={(e) => set("pan", e.target.value.toUpperCase())} data-testid="owner-pan" /></Field>
        <Field label="Gender" required>
          <Select value={o.gender} onChange={(e) => set("gender", e.target.value)} data-testid="owner-gender">
            <option value="">— pick —</option><option>Male</option><option>Female</option><option>Other</option>
          </Select>
        </Field>

        <Field label="Owner Type" required>
          <Select value={o.owner_type} onChange={(e) => set("owner_type", e.target.value)} data-testid="owner-type">
            <option>Primary</option><option>Secondary</option>
          </Select>
        </Field>
      </div>

      <div className="mt-4">
        <button type="button" onClick={add} className="bg-[#0EA5E9] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider inline-flex items-center gap-2" data-testid="owner-add">
          <Plus size={14}/> Add Owner
        </button>
      </div>

      {owners.length > 0 && (
        <div className="border border-zinc-200 mt-5 overflow-x-auto">
          <table className="w-full text-sm" data-testid="owners-table">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="font-mono text-xs uppercase tracking-widest text-zinc-600 text-left">
                <th className="p-3">#</th><th className="p-3">Name</th><th className="p-3">Mobile</th><th className="p-3">PAN / Aadhaar</th><th className="p-3">Type</th><th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((ow, i) => (
                <tr key={ow.id} className="border-b border-zinc-100">
                  <td className="p-3 font-mono">{i + 1}</td>
                  <td className="p-3">{[ow.name_en_first, ow.name_en_middle, ow.name_en_last].filter(Boolean).join(" ")}</td>
                  <td className="p-3 font-mono">{ow.mobile || "—"}</td>
                  <td className="p-3 font-mono text-xs">{ow.pan || "—"} {ow.aadhaar ? ` · ****${ow.aadhaar.slice(-4)}` : ""}</td>
                  <td className="p-3 font-mono uppercase text-xs">{ow.owner_type}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => del(ow.id)} className="px-2 py-1 border border-black hover:bg-[#FF4500] hover:text-white hover:border-[#FF4500] font-mono text-xs uppercase" data-testid={`owner-del-${ow.id}`}><Trash size={12}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- Units sub-form ---------------- */
function UnitsBlock({ units, setUnits, masters }) {
  const [u, setU] = useState(EMPTY_UNIT);
  const set = (k, v) => setU((x) => ({ ...x, [k]: v }));
  const add = () => {
    if (!u.flat_no && !u.floor) return toast.error("Floor or Flat No required");
    setUnits([...units, { ...u, id: crypto.randomUUID() }]);
    setU(EMPTY_UNIT);
  };
  const del = (id) => setUnits(units.filter((x) => x.id !== id));

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Floor"><Select value={u.floor} onChange={(e) => set("floor", e.target.value)} data-testid="unit-floor">
          <option value="">— pick —</option>
          {["Basement","Ground","1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th"].map((f) => <option key={f}>{f}</option>)}
        </Select></Field>
        <Field label="Flat No"><Input value={u.flat_no} onChange={(e) => set("flat_no", e.target.value)} data-testid="unit-flat-no" /></Field>
        <Field label="Standard Rate ₹/sqm"><Input type="number" step="0.01" value={u.standard_rate} onChange={(e) => set("standard_rate", e.target.value)} data-testid="unit-std-rate" /></Field>

        <Field label="Manual Area (sqm)"><Input type="number" step="0.01" value={u.manual_area} onChange={(e) => set("manual_area", e.target.value)} data-testid="unit-manual-area" /></Field>
        <Field label="Carpet Area (sqm)"><Input type="number" step="0.01" value={u.carpet_area} onChange={(e) => set("carpet_area", e.target.value)} data-testid="unit-carpet" /></Field>
        <Field label="Assessable Area (sqm)"><Input type="number" step="0.01" value={u.assessable_area} onChange={(e) => set("assessable_area", e.target.value)} data-testid="unit-assessable" /></Field>

        <Field label="Annual Area (sqm)"><Input type="number" step="0.01" value={u.annual_area} onChange={(e) => set("annual_area", e.target.value)} data-testid="unit-annual" /></Field>
        <Field label="Usage Type"><Select value={u.usage_type_id} onChange={(e) => set("usage_type_id", e.target.value)} data-testid="unit-usage">
          <option value="">— pick —</option>
          {masters.usage.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </Select></Field>
        <Field label="Usage Sub Type"><Input value={u.usage_sub_type} onChange={(e) => set("usage_sub_type", e.target.value)} data-testid="unit-usage-sub" /></Field>

        <Field label="Construction Class"><Select value={u.construction_class_id} onChange={(e) => set("construction_class_id", e.target.value)} data-testid="unit-const-class">
          <option value="">— pick —</option>
          {masters.constClasses.map((x) => <option key={x.id} value={x.id}>{x.class_code} · {x.class_name}</option>)}
        </Select></Field>
        <Field label="Open Plot"><Select value={u.open_plot} onChange={(e) => set("open_plot", e.target.value)} data-testid="unit-open-plot"><option value="no">No</option><option value="yes">Yes</option></Select></Field>
        <Field label="Occupancy Type"><Select value={u.occupancy_type} onChange={(e) => set("occupancy_type", e.target.value)} data-testid="unit-occupancy">
          <option value="">— pick —</option><option>Self Occupied</option><option>Tenant</option><option>Vacant</option><option>Mixed</option>
        </Select></Field>

        <Field label="Assessment Date"><Input type="date" value={u.assessment_date} onChange={(e) => set("assessment_date", e.target.value)} data-testid="unit-assess-date" /></Field>
        <Field label="Flat Status"><Select value={u.flat_status} onChange={(e) => set("flat_status", e.target.value)} data-testid="unit-status">
          <option>Active</option><option>Inactive</option><option>Under Construction</option><option>Demolished</option>
        </Select></Field>
      </div>

      <div className="mt-4">
        <button type="button" onClick={add} className="bg-[#0EA5E9] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider inline-flex items-center gap-2" data-testid="unit-add">
          <Plus size={14}/> Add Unit
        </button>
      </div>

      {units.length > 0 && (
        <div className="border border-zinc-200 mt-5 overflow-x-auto">
          <table className="w-full text-sm" data-testid="units-table">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="font-mono text-xs uppercase tracking-widest text-zinc-600 text-left">
                <th className="p-3">#</th><th className="p-3">Floor</th><th className="p-3">Flat</th><th className="p-3">Carpet</th><th className="p-3">Usage / Class</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {units.map((un, i) => (
                <tr key={un.id} className="border-b border-zinc-100">
                  <td className="p-3 font-mono">{i + 1}</td>
                  <td className="p-3">{un.floor || "—"}</td>
                  <td className="p-3">{un.flat_no || "—"}</td>
                  <td className="p-3 font-mono">{un.carpet_area || "—"}</td>
                  <td className="p-3 text-xs">{masters.usage.find((x)=>x.id===un.usage_type_id)?.name || "—"} · {masters.constClasses.find((x)=>x.id===un.construction_class_id)?.class_code || "—"}</td>
                  <td className="p-3 font-mono uppercase text-xs">{un.flat_status}</td>
                  <td className="p-3 text-right"><button onClick={() => del(un.id)} className="px-2 py-1 border border-black hover:bg-[#FF4500] hover:text-white hover:border-[#FF4500] font-mono text-xs uppercase" data-testid={`unit-del-${un.id}`}><Trash size={12}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- Property Form ---------------- */
function PropertyForm({ initial, masters, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_PROP, ...(initial || {}) }));
  const [preview, setPreview] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Owner Name + Mobile derived from primary owner for engine compatibility
  useEffect(() => {
    if (form.owners?.length && !form.owner_name) {
      const p = form.owners.find((o) => o.owner_type === "Primary") || form.owners[0];
      const name = [p.name_en_first, p.name_en_middle, p.name_en_last].filter(Boolean).join(" ");
      setForm((f) => ({ ...f, owner_name: name, mobile: f.mobile || p.mobile }));
    }
  }, [form.owners, form.owner_name]);

  const ready = form.property_no && form.owner_name && form.address && form.ward_id && form.zone_id &&
                form.construction_type_id && form.usage_type_id && Number(form.carpet_area_sqm) > 0 && form.year_built;

  const computePreview = async () => {
    if (!ready) return toast.error("Fill the * fields in Tax Engine section first");
    try {
      const { data } = await ptApi.properties.preview({
        ...form, carpet_area_sqm: Number(form.carpet_area_sqm), year_built: Number(form.year_built),
      });
      setPreview(data);
    } catch (e) { toast.error(e.response?.data?.detail || "Preview failed"); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return toast.error("Fill all mandatory fields marked *");
    try {
      await onSave({
        ...form,
        carpet_area_sqm: Number(form.carpet_area_sqm),
        year_built: Number(form.year_built),
        pin_code: form.pin_code ? String(form.pin_code) : null,
      });
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  return (
    <form onSubmit={submit} className="pb-12">
      <div className="flex items-center justify-between bg-white border-2 border-black brutal-shadow p-5">
        <div>
          <div className="mono-label">FORM / PROPERTY</div>
          <h3 className="font-heading font-bold text-2xl">{initial?.id ? "Edit property" : "New Property Entry"}</h3>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="bg-white text-black border border-black hover:bg-zinc-100 px-3 py-2 font-mono uppercase text-xs tracking-wider inline-flex items-center gap-2"><X size={14}/> Cancel</button>
          <button type="button" onClick={computePreview} className="bg-black text-white hover:bg-[#0EA5E9] px-3 py-2 font-mono uppercase text-xs tracking-wider" data-testid="prop-preview">Preview Tax</button>
          <button type="submit" className="bg-[#0EA5E9] text-white hover:bg-black px-3 py-2 font-mono uppercase text-xs tracking-wider inline-flex items-center gap-2" data-testid="prop-submit"><FloppyDisk size={14}/> Save Property</button>
        </div>
      </div>

      {/* SECTION 1: Property Details */}
      <Section index="1" title="Property Details" hint="SECTION / 01">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Property No." required><Input value={form.property_no} onChange={(e) => set("property_no", e.target.value)} required data-testid="prop-property_no" /></Field>
          <Field label="Reference Property No."><Input value={form.reference_property_no} onChange={(e) => set("reference_property_no", e.target.value)} data-testid="prop-ref-no" /></Field>
          <Field label="Property Old No."><Input value={form.property_old_no} onChange={(e) => set("property_old_no", e.target.value)} data-testid="prop-old-no" /></Field>
          <Field label="Manual Property No."><Input value={form.manual_property_no} onChange={(e) => set("manual_property_no", e.target.value)} data-testid="prop-manual-no" /></Field>
          <Field label="Sequence No."><Input value={form.sequence_no} onChange={(e) => set("sequence_no", e.target.value)} data-testid="prop-seq-no" /></Field>
          <Field label="Property Status">
            <Select value={form.property_status} onChange={(e) => set("property_status", e.target.value)} data-testid="prop-status-dd">
              <option value="data_entry">Data Entry</option><option value="active">Active</option><option value="assessed">Assessed</option><option value="archived">Archived</option>
            </Select>
          </Field>
          <Field label="Status" required>
            <Select value={form.status} onChange={(e) => set("status", e.target.value)} data-testid="prop-status">
              <option value="new">New</option><option value="existing">Existing</option><option value="demolished">Demolished</option><option value="under_construction">Under Construction</option>
            </Select>
          </Field>
          <Field label="Administrative Boundaries (Ward)" required>
            <Select value={form.ward_id} onChange={(e) => set("ward_id", e.target.value)} required data-testid="prop-ward_id">
              <option value="">— select —</option>
              {masters.wards.map((w) => <option key={w.id} value={w.id}>{w.ward_no} · {w.ward_name}</option>)}
            </Select>
          </Field>
          <Field label="Revenue Boundaries"><Input value={form.revenue_boundaries} onChange={(e) => set("revenue_boundaries", e.target.value)} data-testid="prop-rev-bound" /></Field>
          <Field label="Please Select Zone" required>
            <Select value={form.zone_id} onChange={(e) => set("zone_id", e.target.value)} required data-testid="prop-zone_id">
              <option value="">— select —</option>
              {masters.zones.map((z) => <option key={z.id} value={z.id}>{z.zone_no} · {z.zone_name} (₹{z.base_rate}/sqm)</option>)}
            </Select>
          </Field>
          <Field label="Generate Special Notice">
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={!!form.generate_special_notice} onChange={(e) => set("generate_special_notice", e.target.checked)} data-testid="prop-gen-notice" />
              <span className="text-sm">Issue Section 167 notice after save</span>
            </label>
          </Field>
        </div>
      </Section>

      {/* SECTION 2: Owners */}
      <Section index="2" title="Owner Information" hint="SECTION / 02 — multi-owner supported">
        <OwnersBlock owners={form.owners} setOwners={(v) => set("owners", v)} />
      </Section>

      {/* SECTION 3: Location & Usage */}
      <Section index="3" title="Location and Usage Details" hint="SECTION / 03">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="City Survey No."><Input value={form.city_survey_no} onChange={(e) => set("city_survey_no", e.target.value)} data-testid="prop-cs-no" /></Field>
          <Field label="Plot Number"><Input value={form.plot_number} onChange={(e) => set("plot_number", e.target.value)} data-testid="prop-plot-no" /></Field>
          <Field label="Part Hissa Number"><Input value={form.part_hissa_number} onChange={(e) => set("part_hissa_number", e.target.value)} data-testid="prop-hissa" /></Field>

          <Field label="Property Type" required>
            <Select value={form.property_type} onChange={(e) => set("property_type", e.target.value)} required data-testid="prop-type">
              <option value="">— select —</option>
              <option>Building</option><option>Open Plot</option><option>Flat</option><option>Bungalow</option><option>Row House</option><option>Shop</option><option>Other</option>
            </Select>
          </Field>
          <Field label="Property Sub Type" required>
            <Select value={form.property_sub_type} onChange={(e) => set("property_sub_type", e.target.value)} required data-testid="prop-sub-type">
              <option value="">— select —</option>
              <option>Residential Unit</option><option>Commercial Unit</option><option>Industrial Unit</option><option>Mixed Use</option><option>Vacant Land</option>
            </Select>
          </Field>
          <Field label="Flat/House No."><Input value={form.flat_house_no} onChange={(e) => set("flat_house_no", e.target.value)} data-testid="prop-flat-house" /></Field>

          <Field label="House/Apartment Name"><Input value={form.house_apartment_name} onChange={(e) => set("house_apartment_name", e.target.value)} data-testid="prop-house-name" /></Field>
          <Field label="Street/Road"><Input value={form.street_road} onChange={(e) => set("street_road", e.target.value)} data-testid="prop-street" /></Field>
          <Field label="Area/Locality" required><Input value={form.area_locality} onChange={(e) => set("area_locality", e.target.value)} required data-testid="prop-area" /></Field>

          <Field label="Property Usage Type" required>
            <Select value={form.usage_type_id} onChange={(e) => set("usage_type_id", e.target.value)} required data-testid="prop-usage_type_id">
              <option value="">— select —</option>
              {masters.usage.map((u) => <option key={u.id} value={u.id}>{u.name} (×{u.factor})</option>)}
            </Select>
          </Field>
          <Field label="Property Usage Sub Type">
            <Input value={form.property_usage_sub_type} onChange={(e) => set("property_usage_sub_type", e.target.value)} data-testid="prop-usage-sub" />
          </Field>
          <Field label="Landmark"><Input value={form.landmark} onChange={(e) => set("landmark", e.target.value)} data-testid="prop-landmark" /></Field>

          <Field label="Pin Code"><Input maxLength={6} value={form.pin_code} onChange={(e) => set("pin_code", e.target.value.replace(/\D/g, ""))} data-testid="prop-pin" /></Field>
          <Field label="Bill Type" required>
            <Select value={form.bill_type} onChange={(e) => set("bill_type", e.target.value)} data-testid="prop-bill-type">
              <option value="annual">Annual</option><option value="half_yearly">Half Yearly</option><option value="quarterly">Quarterly</option>
            </Select>
          </Field>
          <Field label="Delivery Type" required>
            <Select value={form.delivery_type} onChange={(e) => set("delivery_type", e.target.value)} data-testid="prop-delivery">
              <option value="post">Post</option><option value="email">Email</option><option value="sms">SMS</option><option value="hand">Hand Delivery</option>
            </Select>
          </Field>

          <Field label="Current Assessment"><Input type="date" value={form.current_assessment} onChange={(e) => set("current_assessment", e.target.value)} data-testid="prop-current-assess" /></Field>
          <Field label="First Assessment"><Input type="date" value={form.first_assessment} onChange={(e) => set("first_assessment", e.target.value)} data-testid="prop-first-assess" /></Field>
          <Field label="Re-Assessment"><Input type="date" value={form.re_assessment} onChange={(e) => set("re_assessment", e.target.value)} data-testid="prop-re-assess" /></Field>
          <Field label="Last Assessment"><Input type="date" value={form.last_assessment} onChange={(e) => set("last_assessment", e.target.value)} data-testid="prop-last-assess" /></Field>

          <div className="md:col-span-3">
            <Field label="Property Description">
              <textarea rows={3} value={form.property_description} onChange={(e) => set("property_description", e.target.value)} className="w-full border border-zinc-300 px-3 py-2 bg-white" data-testid="prop-desc" />
            </Field>
          </div>
          <div className="md:col-span-3">
            <Field label="Property Address (compact)" required>
              <textarea rows={2} required value={form.address} onChange={(e) => set("address", e.target.value)} className="w-full border border-zinc-300 px-3 py-2 bg-white" data-testid="prop-address" />
            </Field>
          </div>
        </div>
      </Section>

      {/* SECTION 4: Unit Details */}
      <Section index="4" title="Unit-Specific / Construction Details" hint="SECTION / 04 — repeatable">
        <UnitsBlock units={form.units} setUnits={(v) => set("units", v)} masters={masters} />
      </Section>

      {/* SECTION 5: Tax Engine inputs */}
      <Section index="5" title="Tax Engine Inputs" hint="SECTION / 05 — required for ALV / RV / Tax computation">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Construction Type" required>
            <Select value={form.construction_type_id} onChange={(e) => set("construction_type_id", e.target.value)} required data-testid="prop-construction_type_id">
              <option value="">— select —</option>
              {masters.construction.map((c) => <option key={c.id} value={c.id}>{c.name} (×{c.factor})</option>)}
            </Select>
          </Field>
          <Field label="Carpet Area (sqm)" required><Input type="number" min="1" step="0.01" required value={form.carpet_area_sqm} onChange={(e) => set("carpet_area_sqm", e.target.value)} data-testid="prop-carpet_area_sqm" /></Field>
          <Field label="Year Built" required><Input type="number" min="1800" max={new Date().getFullYear()} required value={form.year_built} onChange={(e) => set("year_built", e.target.value)} data-testid="prop-year_built" /></Field>
          <Field label="Primary Owner Name (engine)" required><Input required value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} data-testid="prop-owner_name" placeholder="Auto-filled from primary owner if blank" /></Field>
          <Field label="Mobile (engine)"><Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} data-testid="prop-mobile" /></Field>
        </div>

        {preview && (
          <div className="mt-5 border border-black p-4 bg-zinc-50" data-testid="prop-preview-out">
            <div className="mono-label">COMPUTED — PREVIEW</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2 font-mono">
              <div><div className="mono-label">ALV</div><div>{inr(preview.alv)}</div></div>
              <div><div className="mono-label">RV</div><div>{inr(preview.rv)}</div></div>
              <div><div className="mono-label">AGE / DEP</div><div>{preview.years_old}y · {preview.depreciation_pct}%</div></div>
              <div><div className="mono-label">TOTAL TAX</div><div className="text-[#0EA5E9] font-semibold">{inr(preview.total_tax)}</div></div>
            </div>
          </div>
        )}
      </Section>
    </form>
  );
}

/* ---------------- Page wrapper (list + editor) ---------------- */
export default function PTProperties() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [masters, setMasters] = useState({ wards: [], zones: [], construction: [], usage: [], constClasses: [] });

  const load = async () => {
    const { data } = await ptApi.properties.list({ q: q || undefined });
    setRows(data);
  };

  useEffect(() => {
    (async () => {
      const [w, z, c, u, cc] = await Promise.all([
        ptApi.wards.list(), ptApi.zones.list(), ptApi.construction.list(), ptApi.usage.list(),
        (await import("@/lib/api")).api.get("/pt/construction-classes"),
      ]);
      setMasters({ wards: w.data, zones: z.data, construction: c.data, usage: u.data, constClasses: cc.data });
    })();
    load();
    // eslint-disable-next-line
  }, []);

  const mastersMap = useMemo(() => ({
    wards: Object.fromEntries(masters.wards.map((x) => [x.id, x])),
    zones: Object.fromEntries(masters.zones.map((x) => [x.id, x])),
  }), [masters]);

  const onSave = async (payload) => {
    if (editing?.id) {
      await ptApi.properties.update(editing.id, payload);
      toast.success("Property updated");
    } else {
      const { data } = await ptApi.properties.create(payload);
      toast.success(`Property ${data.property_no} saved`);
      if (payload.generate_special_notice) {
        try {
          const fy = new Date().getFullYear();
          await ptApi.notices.generate(data.id, fy);
          toast.success("Special notice generated");
        } catch (e) { /* non-fatal */ }
      }
    }
    setEditing(null);
    load();
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this property?")) return;
    try { await ptApi.properties.del(id); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const recompute = async (id) => {
    try { await ptApi.properties.recompute(id); toast.success("Recomputed"); load(); }
    catch (e) { toast.error("Failed"); }
  };

  if (editing) {
    return (
      <div className="p-8 lg:p-12">
        <PageHeader index="PT-02" title="Property" subtitle="Full data entry — Property, Owners, Location, Units, Tax." />
        <div className="mt-2">
          <PropertyForm initial={editing === "new" ? null : editing} masters={masters} onSave={onSave} onCancel={() => setEditing(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12">
      <PageHeader index="PT-02" title="Properties" subtitle="Data entry of properties with live ALV / RV computation."
        right={
          <button onClick={() => setEditing("new")} className="bg-[#0EA5E9] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider flex items-center gap-2" data-testid="prop-new">
            <Plus size={14} /> New Property
          </button>
        }
      />

      <div className="bg-white border border-zinc-200 mt-6 p-4 flex gap-2">
        <div className="flex items-center border border-zinc-300 px-3 flex-1">
          <MagnifyingGlass size={16} />
          <input placeholder="Search by property no / owner / address" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 px-2 py-2 outline-none bg-transparent" data-testid="prop-search" />
        </div>
        <button onClick={load} className="bg-black text-white hover:bg-[#0EA5E9] px-4 py-2 font-mono uppercase text-xs tracking-wider" data-testid="prop-search-go">Search</button>
      </div>

      <div className="bg-white border border-zinc-200 mt-4 overflow-x-auto">
        <table className="w-full text-sm" data-testid="prop-table">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="font-mono text-xs uppercase tracking-widest text-zinc-600 text-left">
              <th className="p-3">Prop No</th><th className="p-3">Owner</th><th className="p-3">Ward / Zone</th><th className="p-3">Area</th><th className="p-3">ALV</th><th className="p-3">RV</th><th className="p-3">Total Tax</th><th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-zinc-100 hover:bg-zinc-50" data-testid={`prop-row-${p.id}`}>
                <td className="p-3 font-mono">{p.property_no}</td>
                <td className="p-3">
                  <div className="font-medium">{p.owner_name}</div>
                  <div className="text-xs text-zinc-500 truncate max-w-xs">{p.address}</div>
                </td>
                <td className="p-3 text-xs">
                  <div>{mastersMap.wards[p.ward_id]?.ward_name || "—"}</div>
                  <div className="text-zinc-500">{mastersMap.zones[p.zone_id]?.zone_name || "—"}</div>
                </td>
                <td className="p-3 font-mono">{p.carpet_area_sqm} sqm</td>
                <td className="p-3 font-mono">{inr(p.computed?.alv)}</td>
                <td className="p-3 font-mono">{inr(p.computed?.rv)}</td>
                <td className="p-3 font-mono text-[#0EA5E9] font-semibold">{inr(p.computed?.total_tax)}</td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => recompute(p.id)} className="px-2 py-1 border border-black hover:bg-black hover:text-white" title="Recompute" data-testid={`prop-recompute-${p.id}`}><ArrowsClockwise size={12} /></button>
                    <button onClick={() => setEditing(p)} className="px-2 py-1 border border-black hover:bg-black hover:text-white" title="Edit" data-testid={`prop-edit-${p.id}`}><Pencil size={12} /></button>
                    <button onClick={() => onDelete(p.id)} className="px-2 py-1 border border-black hover:bg-[#FF4500] hover:text-white hover:border-[#FF4500]" title="Delete" data-testid={`prop-del-${p.id}`}><Trash size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-zinc-500 font-mono text-sm">// NO PROPERTIES — CLICK &quot;NEW PROPERTY&quot; TO ADD ONE</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
