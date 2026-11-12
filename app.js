// الإعدادات العامة: أضف رابط مشروع Supabase والمفتاح العام anon فقط.
const SUPABASE_URL = "https://tcziyvcpjscxndrkvdwn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_G7mJ5U_SOEB0IN7qg4ra8Q_4SsVqec9";

const ready = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_") && !!SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = ready && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const safe = (v = "") => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dateText = v => v ? new Date(v).toLocaleDateString("ar-MA") : "غير محدد";
const dateTimeText = v => v ? new Date(v).toLocaleString("ar-MA", { dateStyle: "medium", timeStyle: "short" }) : "غير محدد";
const dataOf = f => Object.fromEntries(new FormData(f).entries());
const msg = (selector, text, bad = false) => { const el = $(selector); if (el) { el.textContent = text; el.style.color = bad ? "#b33d3d" : "#28734d"; } };
const toast = text => { const el = $("#toast"); if (!el) return; el.textContent = text; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 3500); };

if ($("#year")) $("#year").textContent = new Date().getFullYear();
$("#menuToggle")?.addEventListener("click", () => $("#mainNav")?.classList.toggle("open"));
$$("#mainNav a").forEach(a => a.addEventListener("click", () => $("#mainNav")?.classList.remove("open")));

// تحويل روابط يوتيوب أو فيميو أو روابط الفيديو المباشرة إلى مشغل مدمج
function renderVideoEmbed(url) {
  if (!url) return "";
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" allowfullscreen loading="lazy"></iframe></div>`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `<div class="video-embed"><iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" allowfullscreen loading="lazy"></iframe></div>`;
  }
  return `<div class="video-embed"><video src="${safe(url)}" controls preload="metadata"></video></div>`;
}

// نافذة معاينة الصور والشهادات (Lightbox)
function openLightbox(imgUrl, title = "", desc = "") {
  const modal = $("#lightboxModal");
  if (!modal) return;
  $("#lightboxImg").src = imgUrl;
  $("#lightboxTitle").textContent = title;
  $("#lightboxDesc").textContent = desc;
  modal.classList.remove("hidden");
}
$("#closeLightbox")?.addEventListener("click", () => $("#lightboxModal")?.classList.add("hidden"));
$("#lightboxModal")?.addEventListener("click", e => { if (e.target.id === "lightboxModal") e.currentTarget.classList.add("hidden"); });

async function insert(table, data) {
  if (!db) throw new Error("لم يتم ربط قاعدة بيانات Supabase بعد. أضف بيانات الاتصال في app.js.");
  const { error } = await db.from(table).insert(data);
  if (error) throw error;
}

// استمارة طلب الانخراط
const joinForm = $("#joinForm");
joinForm?.addEventListener("submit", async e => {
  e.preventDefault();
  const d = dataOf(joinForm);
  try {
    await insert("membership_applications", { ...d, status: "pending" });
    msg("#joinMessage", "تم إرسال طلب الانخراط بنجاح. سيقوم المكتب بمراجعته وإشعاركم عبر واتساب.");
    joinForm.reset();
  } catch (err) {
    msg("#joinMessage", err.message, true);
  }
});

// استمارة التواصل
const contactForm = $("#contactForm");
contactForm?.addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await insert("contact_messages", dataOf(contactForm));
    msg("#contactMessage", "تم إرسال رسالتكم بنجاح، شكراً لتواصلكم.");
    contactForm.reset();
  } catch (err) {
    msg("#contactMessage", err.message, true);
  }
});

// ============================================================================
// 1. تحميل البيانات العامة: عارضة الأخبار، الأخبار، الشواهد، والهيكل التنظيمي
// ============================================================================
let publicNewsCache = [];

async function loadPublic() {
  if (!db) return;

  const [newsRes, actRes, certRes, boardRes] = await Promise.all([
    db.from("posts").select("*").eq("type", "news").eq("published", true).order("created_at", { ascending: false }),
    db.from("posts").select("*").eq("type", "activity").eq("published", true).order("event_date", { ascending: false }),
    db.from("certificates").select("*").eq("published", true).order("display_order", { ascending: true }),
    db.from("board_members").select("*").eq("active", true).order("display_order", { ascending: true })
  ]);

  if (!newsRes.error) {
    publicNewsCache = newsRes.data || [];
    renderNewsTicker(publicNewsCache);
    renderNews(publicNewsCache, "#newsList");
    renderNews(publicNewsCache.slice(0, 3), "#homeNewsGrid");

    // فتح خبر محدد إذا تم القدوم من رابط عارضة الأخبار (?id=...)
    const params = new URLSearchParams(location.search);
    const openId = params.get("id");
    if (openId && $("#newsDetailModal")) {
      const target = publicNewsCache.find(x => x.id === openId);
      if (target) openNewsDetail(target);
    }
  }

  if (!actRes.error && $("#activitiesList")) {
    renderActivities(actRes.data || []);
  }

  if (!certRes.error) {
    renderCertificates(certRes.data || [], "#certificatesGrid");
    renderCertificates(certRes.data || [], "#aboutCertificatesGrid");
  }

  if (!boardRes.error) {
    renderOrganigramme(boardRes.data || []);
  }
}

function renderNewsTicker(items) {
  const track = $("#newsTickerTrack");
  if (!track || !items.length) return;
  const links = items.slice(0, 8).map(x => `<a href="news.html?id=${safe(x.id)}">● ${safe(x.title)} (${dateText(x.created_at)})</a>`).join("");
  track.innerHTML = links + links; // تكرار لضمان حركة دائرية سلسة
}

function renderNews(items, selector) {
  const el = $(selector);
  if (!el) return;
  el.innerHTML = items.length ? items.map(x => `
    <article class="news-card">
      <div class="news-cover">
        ${x.image_url ? `<img src="${safe(x.image_url)}" alt="${safe(x.title)}" loading="lazy">` : "❧"}
      </div>
      <div class="news-body">
        <small>${dateText(x.created_at)} ${x.video_url ? "· 🎬 فيديو مرفق" : ""}</small>
        <h3>${safe(x.title)}</h3>
        <p>${safe(x.summary || x.body || "").slice(0, 180)}...</p>
        <button class="small-btn" onclick="openNewsById('${safe(x.id)}')">قراءة التفاصيل ←</button>
      </div>
    </article>
  `).join("") : '<div class="empty-state">لا توجد أخبار منشورة حالياً.</div>';
}

window.openNewsById = function (id) {
  const item = publicNewsCache.find(x => x.id === id);
  if (item) openNewsDetail(item);
  else location.href = `news.html?id=${id}`;
};

function openNewsDetail(x) {
  const modal = $("#newsDetailModal");
  const box = $("#newsModalContent");
  if (!modal || !box) {
    location.href = `news.html?id=${x.id}`;
    return;
  }
  box.innerHTML = `
    <small style="color:#a47d31;font-weight:700">${dateText(x.created_at)}</small>
    <h2 style="color:#214d3b;margin:6px 0 14px">${safe(x.title)}</h2>
    ${x.image_url ? `<img src="${safe(x.image_url)}" alt="${safe(x.title)}" style="margin-bottom:14px">` : ""}
    ${x.video_url ? renderVideoEmbed(x.video_url) : ""}
    ${x.summary ? `<p class="lead">${safe(x.summary)}</p>` : ""}
    <div style="white-space:pre-line;color:#34493e;font-size:14px">${safe(x.body || "")}</div>
  `;
  modal.classList.remove("hidden");
}
$("#closeNewsModal")?.addEventListener("click", () => $("#newsDetailModal")?.classList.add("hidden"));
$("#newsDetailModal")?.addEventListener("click", e => { if (e.target.id === "newsDetailModal") e.currentTarget.classList.add("hidden"); });

function renderActivities(items) {
  const el = $("#activitiesList");
  if (!el) return;
  el.innerHTML = items.length ? items.map(x => `
    <article class="content-item">
      <div>
        <h3>${safe(x.title)}</h3>
        <p>${safe(x.summary || x.body || "")}</p>
      </div>
      <span class="date-pill">${dateText(x.event_date || x.created_at)}</span>
    </article>
  `).join("") : '<div class="empty-state">سيتم نشر الأنشطة المبرمجة والمنجزة هنا بعد إضافتها من الإدارة.</div>';
}

function renderCertificates(items, selector) {
  const el = $(selector);
  if (!el) return;
  if (!items.length) return;
  el.innerHTML = items.map(c => `
    <article class="cert-card" onclick="openLightbox('${safe(c.image_url)}', '${safe(c.title)}', '${safe(c.issuer + (c.description ? " - " + c.description : ""))}')">
      <div class="cert-thumb">
        <img src="${safe(c.image_url)}" alt="${safe(c.title)}" loading="lazy">
        <span class="cert-zoom">معاينة الشهادة 🔍</span>
      </div>
      <div class="cert-body">
        <small>${safe(c.issuer)} ${c.award_date ? "· " + dateText(c.award_date) : ""}</small>
        <h3>${safe(c.title)}</h3>
        <p>${safe(c.description || "")}</p>
      </div>
    </article>
  `).join("");
}

function renderOrganigramme(members) {
  const host = $("#organigrammeContainer");
  if (!host) return;
  if (!members.length) {
    host.innerHTML = '<div class="empty-state">سيتم عرض الهيكل التنظيمي للمكتب المسير فور تحديث البيانات من لوحة الإدارة.</div>';
    return;
  }
  const levels = [
    { lvl: 1, label: "رئاسة الجمعية" },
    { lvl: 2, label: "الكتابة العامة وأمانة المال" },
    { lvl: 3, label: "نواب المسؤولين والمستشارون المكلفون بمهام" }
  ];
  host.innerHTML = levels.map(g => {
    const groupMembers = members.filter(m => Number(m.hierarchy_level) === g.lvl);
    if (!groupMembers.length) return "";
    return `
      <div class="org-level">
        <div class="org-level-title">${g.label}</div>
        <div class="org-row">
          ${groupMembers.map(m => `
            <div class="org-card level-${g.lvl}">
              <div class="org-avatar">
                ${m.photo_url ? `<img src="${safe(m.photo_url)}" alt="${safe(m.full_name)}">` : safe((m.full_name || "ع")[0])}
              </div>
              <span class="org-role">${safe(m.position_title)}</span>
              <h4>${safe(m.full_name)}</h4>
              ${m.responsibilities ? `<p>${safe(m.responsibilities)}</p>` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }).join("");

  // تحديث بطاقات مهام المسؤولين ديناميكياً إذا توفرت اختصاصات مسجلة
  const rolesGrid = $("#boardResponsibilitiesGrid");
  const withRoles = members.filter(m => m.responsibilities && m.responsibilities.trim().length > 0);
  if (rolesGrid && withRoles.length) {
    rolesGrid.innerHTML = withRoles.map(m => `
      <article class="info-card">
        <div class="card-icon">✦</div>
        <small style="color:#a47d31;font-weight:700">${safe(m.full_name)}</small>
        <h3>${safe(m.position_title)}</h3>
        <p>${safe(m.responsibilities)}</p>
      </article>
    `).join("");
  }
}

loadPublic();

// ============================================================================
// 2. فضاء المنخرط والتأطير والتكوين (Member Portal & Training Space)
// ============================================================================
if (db) {
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === "PASSWORD_RECOVERY" && $("#setPasswordForm")) {
      $("#memberLogin")?.classList.add("hidden");
      $("#setPasswordForm")?.classList.remove("hidden");
    }
  });
}

$("#setPasswordForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const d = dataOf(e.currentTarget);
  if (d.new_password !== d.confirm_password) {
    msg("#setPassMessage", "كلمتا المرور غير متطابقتين.", true);
    return;
  }
  const { error } = await db.auth.updateUser({ password: d.new_password });
  if (error) {
    msg("#setPassMessage", error.message, true);
  } else {
    msg("#setPassMessage", "تم تعيين كلمة المرور وتفعيل حسابك بنجاح!");
    $("#setPasswordForm").classList.add("hidden");
    const { data: { user } } = await db.auth.getUser();
    if (user) initMemberDashboard(user);
  }
});

async function login(form, role) {
  const d = dataOf(form);
  if (!db) {
    msg(role === "admin" ? "#adminMessage" : "#memberMessage", "يلزم ربط Supabase وإعداد حساب الدخول أولاً.", true);
    return;
  }
  const { data, error } = await db.auth.signInWithPassword({ email: d.email, password: d.password });
  if (error) {
    msg(role === "admin" ? "#adminMessage" : "#memberMessage", error.message, true);
    return;
  }
  const { data: p, error: pe } = await db.from("profiles").select("*").eq("id", data.user.id).single();
  if (pe) {
    await db.auth.signOut();
    msg(role === "admin" ? "#adminMessage" : "#memberMessage", "تعذر قراءة ملف الحساب.", true);
    return;
  }
  if (role === "admin") {
    if (!["admin", "super_admin"].includes(p.role)) {
      await db.auth.signOut();
      msg("#adminMessage", "هذا الحساب غير مخول لدخول الإدارة.", true);
      return;
    }
    $("#adminLogin")?.classList.add("hidden");
    $("#adminDashboard")?.classList.remove("hidden");
    await showAdminTab("requests");
  } else {
    await initMemberDashboard(data.user, p);
  }
}

async function initMemberDashboard(user, profileData = null) {
  const p = profileData || (await db.from("profiles").select("*").eq("id", user.id).single()).data || {};
  $("#memberLogin")?.classList.add("hidden");
  const box = $("#memberDashboard");
  if (!box) return;
  box.classList.remove("hidden");
  box.innerHTML = `
    <div class="member-header">
      <div>
        <h3 style="margin:0;color:#214d3b">مرحباً ${safe(p.full_name || user.email)}</h3>
        <small style="color:#6c7b72">البريد: ${safe(user.email)} · الصفة المهنية: <b>${safe(p.profession || "منخرط")}</b> · الحالة: <span class="status">${safe(p.membership_status === "active" ? "عضوية مفعلة" : p.membership_status)}</span></small>
      </div>
      <button id="memberLogout" class="btn btn-outline-dark">تسجيل الخروج</button>
    </div>

    <div class="member-tabs">
      <button class="tab active" data-mtab="training">فضاء التأطير والتكوين</button>
      <button class="tab" data-mtab="enrollments">سجل دوراتي المتاحة والمسجلة</button>
      <button class="tab" data-mtab="products">منتوجاتي في المعرض</button>
    </div>

    <div id="memberTabContent"></div>
  `;

  $("#memberLogout")?.addEventListener("click", async () => { await db.auth.signOut(); location.reload(); });
  box.querySelectorAll("[data-mtab]").forEach(btn => {
    btn.addEventListener("click", () => {
      box.querySelectorAll("[data-mtab]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderMemberTab(btn.dataset.mtab, user, p);
    });
  });

  renderMemberTab("training", user, p);
}

async function renderMemberTab(tabName, user, profile) {
  const host = $("#memberTabContent");
  if (!host) return;
  host.innerHTML = '<div class="empty-state">جار تحميل المحتوى...</div>';

  if (tabName === "training" || tabName === "enrollments") {
    const [{ data: trainings, error }, { data: myEnrolls }] = await Promise.all([
      db.from("trainings").select("*").eq("published", true).order("created_at", { ascending: false }),
      db.from("training_enrollments").select("*").eq("member_id", user.id)
    ]);

    if (error) { host.textContent = error.message; return; }
    const enrolledIds = new Set((myEnrolls || []).map(e => e.training_id));

    // تصفية المحتوى المخصص للفئة المهنية للمنخرط أو الموجه للجميع
    const relevantTrainings = (trainings || []).filter(t =>
      t.target_profession === "all" || !t.target_profession || t.target_profession === profile.profession
    );

    if (tabName === "enrollments") {
      const myCourses = relevantTrainings.filter(t => t.content_type === "course" || t.content_type === "schedule");
      host.innerHTML = `
        <h4 style="color:#214d3b">سجل الدورات والبرامج التكوينية المتاحة لفئتك (${safe(profile.profession || "عام")})</h4>
        <div class="table-wrap">
          <table class="admin-table">
            <thead><tr><th>عنوان الدورة / البرنامج</th><th>النوع</th><th>الموعد والمكان</th><th>حالة التسجيل</th><th>الإجراء</th></tr></thead>
            <tbody>
              ${myCourses.length ? myCourses.map(c => {
                const isReg = enrolledIds.has(c.id);
                return `<tr>
                  <td><b>${safe(c.title)}</b><br><small>${safe((c.description || "").slice(0, 90))}</small></td>
                  <td>${c.content_type === "course" ? "دورة تكوينية" : "برنامج وموعد"}</td>
                  <td>${dateTimeText(c.event_datetime)}<br><small>${safe(c.location_or_mode || "")}</small></td>
                  <td><span class="status">${isReg ? "مسجل في الدورة" : "متاحة للتسجيل"}</span></td>
                  <td>${isReg ? "✓ تم التسجيل" : `<button class="small-btn" onclick="enrollTraining('${c.id}')">تسجيل الحضور</button>`}</td>
                </tr>`;
              }).join("") : '<tr><td colspan="5">لا توجد دورات مبرمجة حالياً.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    const typeLabels = {
      course: "دورة تكوينية",
      document: "وثيقة / ملف PDF",
      video: "فيديو تعليمي",
      schedule: "برنامج وموعد"
    };

    host.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px">
        <p class="muted" style="margin:0">المحتوى المخصص لفئتك المهنية: <b>${safe(profile.profession || "جميع الفئات")}</b></p>
        <select id="trainingTypeFilter" style="padding:7px 12px;border:1px solid #dfe7e0;border-radius:6px;font-size:12px">
          <option value="all">جميع محتويات التأطير</option>
          <option value="course">الدروس والدورات التكوينية</option>
          <option value="document">ملفات PDF والوثائق</option>
          <option value="video">الصور والفيديوهات التعليمية</option>
          <option value="schedule">البرامج والمواعيد</option>
        </select>
      </div>
      <div id="trainingCardsHost" class="training-grid"></div>
    `;

    const paintTrainings = () => {
      const f = $("#trainingTypeFilter")?.value || "all";
      const filtered = relevantTrainings.filter(t => f === "all" || t.content_type === f);
      $("#trainingCardsHost").innerHTML = filtered.length ? filtered.map(t => {
        const isReg = enrolledIds.has(t.id);
        return `
          <article class="training-card">
            <div>
              <span class="training-badge">${typeLabels[t.content_type] || "محتوى تكويني"}</span>
              <h4>${safe(t.title)}</h4>
              ${t.image_url ? `<img src="${safe(t.image_url)}" alt="" style="width:100%;height:150px;object-fit:cover;border-radius:8px;margin:8px 0">` : ""}
              ${t.video_url ? renderVideoEmbed(t.video_url) : ""}
              <p style="font-size:12px;color:#5d6c63">${safe(t.description || "")}</p>
            </div>
            <div>
              <div class="training-meta">
                ${t.event_datetime ? `<span>📅 ${dateTimeText(t.event_datetime)}</span>` : ""}
                ${t.location_or_mode ? `<span>📍 ${safe(t.location_or_mode)}</span>` : ""}
              </div>
              <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
                ${t.pdf_url ? `<a href="${safe(t.pdf_url)}" target="_blank" rel="noopener" class="small-btn">📄 تحميل الوثيقة PDF</a>` : ""}
                ${(t.content_type === "course" || t.content_type === "schedule") ? (
                  isReg ? '<span class="status">✓ مسجل في الدورة</span>' : `<button class="small-btn" onclick="enrollTraining('${t.id}')">＋ التسجيل في الدورة</button>`
                ) : ""}
              </div>
            </div>
          </article>
        `;
      }).join("") : '<div class="empty-state" style="grid-column:1/-1">لا توجد مواد تكوينية في هذا التصنيف حالياً.</div>';
    };

    $("#trainingTypeFilter")?.addEventListener("change", paintTrainings);
    paintTrainings();
  } else if (tabName === "products") {
    host.innerHTML = `
  
