import { api } from "@/lib/api";

export const PT = "/api/pt";

export const ptApi = {
  // masters
  wards:        { list: () => api.get("/pt/wards"), create: (d) => api.post("/pt/wards", d), update: (id, d) => api.put(`/pt/wards/${id}`, d), del: (id) => api.delete(`/pt/wards/${id}`) },
  zones:        { list: () => api.get("/pt/zones"), create: (d) => api.post("/pt/zones", d), update: (id, d) => api.put(`/pt/zones/${id}`, d), del: (id) => api.delete(`/pt/zones/${id}`) },
  construction: { list: () => api.get("/pt/construction-types"), create: (d) => api.post("/pt/construction-types", d), update: (id, d) => api.put(`/pt/construction-types/${id}`, d), del: (id) => api.delete(`/pt/construction-types/${id}`) },
  usage:        { list: () => api.get("/pt/usage-types"), create: (d) => api.post("/pt/usage-types", d), update: (id, d) => api.put(`/pt/usage-types/${id}`, d), del: (id) => api.delete(`/pt/usage-types/${id}`) },
  age:          { list: () => api.get("/pt/age-factors"), create: (d) => api.post("/pt/age-factors", d), update: (id, d) => api.put(`/pt/age-factors/${id}`, d), del: (id) => api.delete(`/pt/age-factors/${id}`) },
  rates:        { get:  () => api.get("/pt/tax-rates"), update: (d) => api.put("/pt/tax-rates", d) },
  // properties
  properties:   {
    list:   (params={}) => api.get("/pt/properties", { params }),
    get:    (id) => api.get(`/pt/properties/${id}`),
    create: (d) => api.post("/pt/properties", d),
    update: (id, d) => api.put(`/pt/properties/${id}`, d),
    del:    (id) => api.delete(`/pt/properties/${id}`),
    preview:(d) => api.post("/pt/properties/preview", d),
    recompute: (id) => api.post(`/pt/properties/${id}/recompute`),
  },
  notices: {
    list:   () => api.get("/pt/notices"),
    get:    (id) => api.get(`/pt/notices/${id}`),
    generate: (pid, fy) => api.post(`/pt/notices/generate/${pid}`, null, { params: { financial_year: fy } }),
    bulk:   (d) => api.post("/pt/notices/generate-bulk", d),
  },
  bills: {
    list:   (params={}) => api.get("/pt/bills", { params }),
    get:    (id) => api.get(`/pt/bills/${id}`),
    generate: (pid, fy, due) => api.post(`/pt/bills/generate/${pid}`, null, { params: { financial_year: fy, due_date: due } }),
    bulk:   (d) => api.post("/pt/bills/generate-bulk", d),
    pay:    (id) => api.post(`/pt/bills/${id}/pay`),
    cancel: (id) => api.post(`/pt/bills/${id}/cancel`),
    del:    (id) => api.delete(`/pt/bills/${id}`),
  },
  reports: {
    summary: () => api.get("/pt/reports/summary"),
    demand:  (params={}) => api.get("/pt/reports/demand", { params }),
    collection: (params={}) => api.get("/pt/reports/collection", { params }),
    defaulters: () => api.get("/pt/reports/defaulters"),
  },
};

export function inr(n) {
  if (n == null || isNaN(n)) return "₹0.00";
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
