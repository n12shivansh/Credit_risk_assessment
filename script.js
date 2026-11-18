const form = document.getElementById("form");
const $ = (id) => document.getElementById(id);
const PRESETS = {
  safe:  {person_age:35,person_income:90000,person_home_ownership:"MORTGAGE",person_emp_length:10,loan_intent:"HOMEIMPROVEMENT",loan_grade:"A",loan_amnt:8000,loan_int_rate:7.5,cb_person_default_on_file:"N",cb_person_cred_hist_length:12},
  mid:   {person_age:28,person_income:60000,person_home_ownership:"RENT",person_emp_length:4,loan_intent:"PERSONAL",loan_grade:"C",loan_amnt:9000,loan_int_rate:13,cb_person_default_on_file:"N",cb_person_cred_hist_length:5},
  risky: {person_age:22,person_income:20000,person_home_ownership:"RENT",person_emp_length:0,loan_intent:"MEDICAL",loan_grade:"F",loan_amnt:15000,loan_int_rate:20.5,cb_person_default_on_file:"Y",cb_person_cred_hist_length:2}
};

function updateShare() {
  const inc = parseFloat(form.person_income.value), amt = parseFloat(form.loan_amnt.value);
  form.loan_percent_income.value = inc > 0 && amt > 0 ? (amt / inc).toFixed(2) : "";
}
form.addEventListener("input", updateShare);

document.querySelectorAll("[data-preset]").forEach((b) =>
  b.addEventListener("click", () => {
    const p = PRESETS[b.dataset.preset];
    for (const k in p) {
      if (k === "cb_person_default_on_file") $(p[k] === "Y" ? "dY" : "dN").checked = true;
      else form[k].value = p[k];
    }
    updateShare();
    form.requestSubmit();
  })
);

function countUp(el, to, ms = 1300) {
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min((t - t0) / ms, 1), e = 1 - Math.pow(1 - k, 3);
    el.textContent = (to * e).toFixed(1);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function placeTick(th) {
  const a = Math.PI * th, cx = 110, cy = 110;
  const pt = (r) => [cx - r * Math.cos(a), cy - r * Math.sin(a)];
  const [x1, y1] = pt(78), [x2, y2] = pt(102), [tx, ty] = pt(114);
  const l = $("tickline");
  l.setAttribute("x1", x1); l.setAttribute("y1", y1); l.setAttribute("x2", x2); l.setAttribute("y2", y2);
  const t = $("ticktext");
  t.setAttribute("x", tx); t.setAttribute("y", ty);
  t.textContent = "threshold " + Math.round(th * 100) + "%";
  $("tick").setAttribute("opacity", "1");
}

function show(data) {
  const p = data.default_probability, th = data.threshold_used, bad = p >= th;
  $("fill").style.strokeDashoffset = 100 - p * 100;
  placeTick(th);
  $("pctsign").hidden = false;
  countUp($("pct"), p * 100);
  const v = $("verdict");
  v.className = "verdict " + (bad ? "bad" : "ok");
  v.textContent = bad ? "Likely to default" : "Likely to repay";
  void v.offsetWidth; v.classList.add("pop");
  $("note").textContent = bad
    ? "The estimated risk is above the model’s " + (th * 100).toFixed(0) + "% decision threshold."
    : "The estimated risk is below the model’s " + (th * 100).toFixed(0) + "% decision threshold.";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  updateShare();
  const err = $("err"), btn = form.querySelector(".go");
  err.hidden = true;
  const fd = new FormData(form), body = {};
  for (const [k, v] of fd.entries()) body[k] = v;
  ["person_age","person_income","person_emp_length","loan_amnt","loan_int_rate","loan_percent_income","cb_person_cred_hist_length"]
    .forEach((k) => (body[k] = Number(body[k])));
  btn.disabled = true; btn.classList.add("loading");
  try {
    const r = await fetch("/predict", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)});
    if (!r.ok) throw new Error(r.status === 422 ? "Some values are missing or invalid. Check every field." : "The server returned an error. Try again.");
    show(await r.json());
  } catch (x) {
    err.textContent = x.message.includes("fetch") ? "Can’t reach the server. Check your connection and try again." : x.message;
    err.hidden = false;
  } finally {
    btn.disabled = false; btn.classList.remove("loading");
  }
});
