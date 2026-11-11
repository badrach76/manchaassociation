// الإعدادات العامة: أضف رابط مشروع Supabase والمفتاح العام anon فقط.
const SUPABASE_URL = "https://tcziyvcpjscxndrkvdwn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_G7mJ5U_SOEB0IN7qg4ra8Q_4SsVqec9";
const ready = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_") && !!SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = ready && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const safe = (v="") => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateText = v => v ? new Date(v).toLocaleDateString("ar-MA") : "غير محدد";
const dataOf = f => Object.fromEntries(new FormData(f).entries());
const msg = (selector,text,bad=false) => {const el=$(selector);if(el){el.textContent=text;el.style.color=bad?"#b33d3d":"#28734d";}};
const toast = text => {const el=$("#toast");if(!el)return;el.textContent=text;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),3000);};
if($("#year")) $("#year").textContent=new Date().getFullYear();
$("#menuToggle")?.addEventListener("click",()=>$("#mainNav")?.classList.toggle("open"));
$$("#mainNav a").forEach(a=>a.addEventListener("click",()=>$("#mainNav")?.classList.remove("open")));
async function insert(table,data){if(!db)throw new Error("لم يتم ربط قاعدة بيانات Supabase بعد. أضف بيانات الاتصال في app.js ثم أعد النشر.");const {error}=await db.from(table).insert(data);if(error)throw error;}
const joinForm=$("#joinForm");
joinForm?.addEventListener("submit",async e=>{e.preventDefault();const d=dataOf(joinForm);try{await insert("membership_applications",{...d,status:"pending"});msg("#joinMessage","تم إرسال طلب الانخراط بنجاح. سيقوم المكتب بمراجعته.");joinForm.reset();}catch(err){msg("#joinMessage",err.message,true);}});
const contactForm=$("#contactForm");
contactForm?.addEventListener("submit",async e=>{e.preventDefault();try{await insert("contact_messages",dataOf(contactForm));msg("#contactMessage","تم إرسال رسالتكم بنجاح، شكراً لتواصلكم.");contactForm.reset();}catch(err){msg("#contactMessage",err.message,true);}});
async function loadPublic(){if(!db)return;const [n,a]=await Promise.all([db.from("posts").select("*").eq("type","news").eq("published",true).order("created_at",{ascending:false}),db.from("posts").select("*").eq("type","activity").eq("published",true).order("event_date",{ascending:false})]);if(!n.error&&$("#newsList"))renderNews(n.data||[]);if(!a.error&&$("#activitiesList"))renderActivities(a.data||[]);}
function renderNews(items){const el=$("#newsList");if(!el)return;el.innerHTML=items.length?items.map(x=>`<article class="news-card"><div class="news-cover">❧</div><div class="news-body"><small>${dateText(x.created_at)}</small><h3>${safe(x.title)}</h3><p>${safe(x.summary||x.body||"").slice(0,260)}</p></div></article>`).join(""):'<div class="empty-state">لا توجد أخبار منشورة حالياً.</div>';}
function renderActivities(items){const el=$("#activitiesList");if(!el)return;el.innerHTML=items.length?items.map(x=>`<article class="content-item"><div><h3>${safe(x.title)}</h3><p>${safe(x.summary||x.body||"")}</p></div><span class="date-pill">${dateText(x.event_date||x.created_at)}</span></article>`).join(""):'<div class="empty-state">سيتم نشر الأنشطة المبرمجة والمنجزة هنا بعد إضافتها من الإدارة.</div>';}
loadPublic();
async function login(form,role){const d=dataOf(form);if(!db){msg(role==="admin"?"#adminMessage":"#memberMessage","يلزم ربط Supabase وإعداد حساب الدخول أولاً.",true);return;}const {data,error}=await db.auth.signInWithPassword({email:d.email,password:d.password});if(error){msg(role==="admin"?"#adminMessage":"#memberMessage",error.message,true);return;}const {data:p,error:pe}=await db.from("profiles").select("role,full_name,membership_status").eq("id",data.user.id).single();if(pe){await db.auth.signOut();msg(role==="admin"?"#adminMessage":"#memberMessage","تعذر قراءة ملف الحساب. تحقق من إعداد قاعدة البيانات.",true);return;}if(role==="admin"){if(!["admin","super_admin"].includes(p.role)){await db.auth.signOut();msg("#adminMessage","هذا الحساب غير مخول لدخول الإدارة.",true);return;}$("#adminLogin")?.classList.add("hidden");$("#adminDashboard")?.classList.remove("hidden");await showAdminTab("requests");}else{$("#memberLogin")?.classList.add("hidden");const box=$("#memberDashboard");box?.classList.remove("hidden");if(box)box.innerHTML=`<h3>مرحباً ${safe(p.full_name||data.user.email)}</h3><p>البريد الإلكتروني: ${safe(data.user.email)}</p><p>حالة العضوية: ${safe(p.membership_status||"قيد المراجعة")}</p><div class="member-product-area"><h3>إضافة منتوج إلى المعرض</h3><p class="form-hint">أدخل بيانات المنتوج وأرفق صورة واضحة. لن يظهر للعموم إلا بعد مراجعة الإدارة والمصادقة عليه.</p><form id="memberProductForm" class="form-card"><label>اسم المنتوج<input name="product_name" required maxlength="120"></label><label>الصنف<select name="category" required><option value="">اختر الصنف</option><option>زيت الزيتون</option><option>زيتون المائدة</option><option>مشتقات الزيتون</option><option>منتوجات أخرى</option></select></label><label>وصف المنتوج<textarea name="description" rows="3" required maxlength="1200"></textarea></label><div class="form-row"><label>منطقة الإنتاج<input name="origin" placeholder="الجماعة أو المنطقة"></label><label>التعبئة أو الحجم<input name="packaging" placeholder="مثال: 1 لتر، 5 لترات"></label></div><label>رقم التواصل (اختياري)<input name="contact_phone" type="tel"></label><label>صورة المنتوج<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required></label><p class="form-hint">JPG أو PNG أو WEBP · الحد الأقصى 5 ميغابايت.</p><button type="submit" class="btn btn-primary">إرسال للمراجعة</button><p id="productSubmitMessage" class="form-message"></p></form><h3>منتوجاتي وحالة المراجعة</h3><div id="myProducts" class="admin-records">جار تحميل منتوجاتك...</div></div><button id="memberLogout" class="btn btn-outline-dark">تسجيل الخروج</button>`;$("#memberProductForm")?.addEventListener("submit",e=>{e.preventDefault();submitMemberProduct(e.currentTarget);});
 await loadMyProducts();
 $("#memberLogout")?.addEventListener("click",async()=>{await db.auth.signOut();location.reload();});}}
$("#adminLogin")?.addEventListener("submit",e=>{e.preventDefault();login(e.currentTarget,"admin");});
$("#memberLogin")?.addEventListener("submit",e=>{e.preventDefault();login(e.currentTarget,"member");});
$("#logoutAdmin")?.addEventListener("click",async()=>{if(db)await db.auth.signOut();location.reload();});
$$(".tab").forEach(b=>b.addEventListener("click",()=>{$$(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");showAdminTab(b.dataset.tab);}));
async function showAdminTab(tab){const panel=$("#adminPanel");if(!panel)return;panel.innerHTML='<div class="empty-state">جار تحميل البيانات...</div>';if(!db){panel.textContent="اربط Supabase لتفعيل أدوات الإدارة.";return;}
 if(tab==="requests"){const {data,error}=await db.from("membership_applications").select("*").order("created_at",{ascending:false});if(error){panel.textContent=error.message;return;}panel.innerHTML=data.length?`<div class="table-wrap"><table class="admin-table"><thead><tr><th>الاسم / المؤسسة</th><th>الهاتف</th><th>الصفة</th><th>الجماعة</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>${data.map(x=>`<tr><td>${safe(x.full_name)}</td><td>${safe(x.phone)}</td><td>${safe(x.profession)}</td><td>${safe(x.commune)}</td><td>${safe(x.status)}</td><td><button class="small-btn" data-id="${x.id}" data-status="accepted">قبول</button> <button class="small-btn danger" data-id="${x.id}" data-status="rejected">رفض</button></td></tr>`).join("")}</tbody></table></div>`:'<div class="empty-state">لا توجد طلبات انخراط.</div>';panel.querySelectorAll("[data-status]").forEach(b=>b.onclick=async()=>{const {error}=await db.from("membership_applications").update({status:b.dataset.status}).eq("id",b.dataset.id);if(error)toast(error.message);else{toast("تم تحديث حالة الطلب");showAdminTab("requests");}});
 }else if(tab==="posts"){panel.innerHTML=`<form id="postForm" class="admin-compose"><h3>إضافة خبر أو نشاط</h3><label>نوع المحتوى<select name="type"><option value="news">خبر / مستجد</option><option value="activity">نشاط / لقاء</option></select></label><label>العنوان<input name="title" required></label><label>ملخص<textarea name="summary" rows="2"></textarea></label><label>التفاصيل<textarea name="body" rows="5"></textarea></label><label>تاريخ النشاط (اختياري)<input type="date" name="event_date"></label><label class="inline-check"><input type="checkbox" name="published" checked> نشر مباشرة</label><button class="btn btn-primary">حفظ المحتوى</button></form><div id="postRecords" class="admin-records">جار تحميل المحتوى...</div>`;$("#postForm").onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,d=dataOf(f);d.published=f.elements.published.checked;d.created_by=(await db.auth.getUser()).data.user.id;if(!d.event_date)d.event_date=null;const {error}=await db.from("posts").insert(d);if(error)toast(error.message);else{toast("تم حفظ المحتوى");f.reset();loadPublic();showAdminTab("posts");}};const {data,error}=await db.from("posts").select("id,type,title,published,created_at").order("created_at",{ascending:false}).limit(50);const records=$("#postRecords");if(error){records.textContent=error.message;return;}records.innerHTML=data.length?data.map(x=>`<div class="admin-record"><div><b>${safe(x.title)}</b><small>${x.type==="news"?"خبر":"نشاط"} · ${x.published?"منشور":"مسودة"}</small></div><div><button class="small-btn" data-pub="${x.id}" data-value="${!x.published}">${x.published?"إخفاء":"نشر"}</button> <button class="small-btn danger" data-del="${x.id}">حذف</button></div></div>`).join(""):'<div class="empty-state">لا يوجد محتوى بعد.</div>';records.querySelectorAll("[data-pub]").forEach(b=>b.onclick=async()=>{const {error}=await db.from("posts").update({published:b.dataset.value==="true"}).eq("id",b.dataset.pub);if(error)toast(error.message);else showAdminTab("posts");});records.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{if(!confirm("هل تريد حذف هذا المحتوى؟"))return;const {error}=await db.from("posts").delete().eq("id",b.dataset.del);if(error)toast(error.message);else{toast("تم حذف المحتوى");loadPublic();showAdminTab("posts");}});
 }else if(tab==="products"){await showAdminProducts(panel);
 }else if(tab==="messages"){const {data,error}=await db.from("contact_messages").select("*").order("created_at",{ascending:false}).limit(100);if(error){panel.textContent=error.message;return;}panel.innerHTML=data.length?`<div class="table-wrap"><table class="admin-table"><thead><tr><th>الاسم</th><th>التواصل</th><th>الموضوع</th><th>الرسالة</th><th>التاريخ</th></tr></thead><tbody>${data.map(x=>`<tr><td>${safe(x.name)}</td><td>${safe(x.contact)}</td><td>${safe(x.subject)}</td><td>${safe(x.message)}</td><td>${dateText(x.created_at)}</td></tr>`).join("")}</tbody></table></div>`:'<div class="empty-state">لا توجد رسائل.</div>';}}


// معرض المنتوجات: العرض العام للمنتوجات المصادق عليها، والإضافة للمنخرطين فقط.
const PRODUCT_BUCKET = "gallery-products";
const productCategories = ["زيت الزيتون","زيتون المائدة","مشتقات الزيتون","منتوجات أخرى"];
let galleryCache = [];
function productCard(x){
 const image=x.image_url||"";
 return `<article class="product-card"><div class="product-image">${image?`<img src="${safe(image)}" alt="${safe(x.product_name)}" loading="lazy">`:'<div class="product-placeholder">◉</div>'}<span class="product-category">${safe(x.category)}</span></div><div class="product-info"><h3>${safe(x.product_name)}</h3><p>${safe(x.description||"").slice(0,170)}</p><div class="product-meta"><span>⌖ ${safe(x.origin||"المغرب")}</span><span>${safe(x.packaging||"")}</span></div></div></article>`;
}
function paintGallery(){
 const host=$("#galleryProducts");if(!host)return;
 const q=($("#productSearch")?.value||"").trim().toLocaleLowerCase();const cat=$("#productCategory")?.value||"all";
 const list=galleryCache.filter(x=>(cat==="all"||x.category===cat)&&(!q||[x.product_name,x.description,x.origin,x.category].join(" ").toLocaleLowerCase().includes(q)));
 host.innerHTML=list.length?list.map(productCard).join(""):'<div class="empty-state gallery-empty">لا توجد منتوجات مطابقة لبحثك حالياً.</div>';
 const status=$("#galleryStatus");if(status)status.textContent=`عدد المنتوجات المعروضة: ${list.length}`;
}
async function loadGallery(){
 const host=$("#galleryProducts");if(!host)return;
 if(!db){host.innerHTML='<div class="empty-state gallery-empty">المعرض جاهز لاستقبال المنتوجات. يرجى ربط المنصة بقاعدة بيانات Supabase وتطبيق تحديثات SQL حتى تظهر المنتوجات المصادق عليها.</div>';return;}
 host.innerHTML='<div class="empty-state gallery-empty">جار تحميل المنتوجات...</div>';
 const {data,error}=await db.from("member_products").select("id,product_name,category,description,origin,packaging,image_path,created_at").eq("status","approved").order("created_at",{ascending:false});
 if(error){host.innerHTML=`<div class="empty-state gallery-empty">تعذر تحميل المعرض: ${safe(error.message)}</div>`;return;}
 galleryCache=(data||[]).map(x=>({...x,image_url:db.storage.from(PRODUCT_BUCKET).getPublicUrl(x.image_path).data.publicUrl}));paintGallery();
}
$("#productSearch")?.addEventListener("input",paintGallery);
$("#productCategory")?.addEventListener("change",paintGallery);
loadGallery();

async function submitMemberProduct(form){
 const status=$("#productSubmitMessage");const say=(t,bad=false)=>{if(status){status.textContent=t;status.style.color=bad?"#b33d3d":"#28734d";}};
 if(!db){say("يلزم ربط Supabase قبل إضافة المنتوجات.",true);return;}
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user){say("هذه الخدمة مخصصة للمنخرطين المسجلين. المرجو تسجيل الدخول أولاً.",true);return;}
 const f=form.elements;const file=f.image.files[0];
 if(!file){say("يرجى اختيار صورة للمنتوج.",true);return;}
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)){say("الصيغ المقبولة هي JPG وPNG وWEBP.",true);return;}
 if(file.size>5*1024*1024){say("حجم الصورة يجب ألا يتجاوز 5 ميغابايت.",true);return;}
 const submit=form.querySelector('button[type="submit"]');if(submit){submit.disabled=true;submit.textContent="جار الإرسال...";}
 try{
  const ext=file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
  const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
  const {error:uploadError}=await db.storage.from(PRODUCT_BUCKET).upload(path,file,{contentType:file.type,upsert:false});
  if(uploadError)throw uploadError;
  const payload={owner_id:user.id,product_name:f.product_name.value.trim(),category:f.category.value,description:f.description.value.trim(),origin:f.origin.value.trim()||null,packaging:f.packaging.value.trim()||null,contact_phone:f.contact_phone.value.trim()||null,image_path:path,status:"pending"};
  const {error}=await db.from("member_products").insert(payload);
  if(error){await db.storage.from(PRODUCT_BUCKET).remove([path]);throw error;}
  say("تم إرسال المنتوج للمراجعة بنجاح. سيظهر في المعرض بعد مصادقة الإدارة.");form.reset();await loadMyProducts();
 }catch(err){say(err.message||"تعذر إرسال المنتوج.",true);}
 finally{if(submit){submit.disabled=false;submit.textContent="إرسال للمراجعة";}}
}


async function loadMyProducts(){const host=$("#myProducts");if(!host||!db)return;const {data:{user}}=await db.auth.getUser();if(!user)return;const {data,error}=await db.from("member_products").select("id,product_name,category,status,created_at").eq("owner_id",user.id).order("created_at",{ascending:false});if(error){host.textContent=error.message;return;}host.innerHTML=data.length?data.map(x=>`<div class="admin-record"><div><b>${safe(x.product_name)}</b><small>${safe(x.category)} · ${dateText(x.created_at)}</small></div><span class="status">${x.status==="approved"?"مصادق عليه ومنشور":x.status==="rejected"?"مرفوض":"في انتظار المراجعة"}</span></div>`).join(""):'<div class="empty-state">لم تضف أي منتوج بعد.</div>'; }

// لوحة إدارة المعرض: المصادقة أو الرفض أو الحذف.
async function showAdminProducts(panel){
 const {data,error}=await db.from("member_products").select("id,product_name,category,origin,description,image_path,status,created_at,owner_id").order("created_at",{ascending:false}).limit(150);
 if(error){panel.textContent=error.message;return;}
 panel.innerHTML=data.length?`<div class="admin-product-list">${data.map(x=>{const url=db.storage.from(PRODUCT_BUCKET).getPublicUrl(x.image_path).data.publicUrl;return `<article class="admin-record admin-product-record"><div class="admin-product-thumb"><img src="${safe(url)}" alt=""></div><div class="admin-product-copy"><b>${safe(x.product_name)}</b><small>${safe(x.category)} · ${safe(x.origin||"بدون تحديد المنطقة")} · ${dateText(x.created_at)}</small><p>${safe(x.description||"").slice(0,150)}</p><span class="status">${x.status==="approved"?"مصادق عليه":x.status==="rejected"?"مرفوض":"في انتظار المراجعة"}</span></div><div class="admin-product-actions"><button class="small-btn" data-product-status="approved" data-id="${x.id}">مصادقة / نشر</button><button class="small-btn" data-product-status="rejected" data-id="${x.id}">رفض</button><button class="small-btn danger" data-product-delete="${x.id}" data-path="${safe(x.image_path)}">حذف</button></div></article>`}).join("")}</div>`:'<div class="empty-state">لا توجد منتوجات مقدمة للمراجعة بعد.</div>';
 panel.querySelectorAll("[data-product-status]").forEach(b=>b.onclick=async()=>{const {data:{user}}=await db.auth.getUser();const {error}=await db.from("member_products").update({status:b.dataset.productStatus,reviewed_at:new Date().toISOString(),reviewed_by:user.id}).eq("id",b.dataset.id);if(error)toast(error.message);else{toast("تم تحديث حالة المنتوج");showAdminProducts(panel);loadGallery();}});
 panel.querySelectorAll("[data-product-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("هل تريد حذف المنتوج وصورته نهائياً؟"))return;const {error}=await db.from("member_products").delete().eq("id",b.dataset.productDelete);if(error){toast(error.message);return;}await db.storage.from(PRODUCT_BUCKET).remove([b.dataset.path]);toast("تم حذف المنتوج");showAdminProducts(panel);loadGallery();});
}
