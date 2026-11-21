# ATi แจ้งซ่อม · Engineering CMMS

ระบบแจ้งซ่อมและบริหารงานซ่อมบำรุงเครื่องจักรของแผนกวิศวกรรม บริษัท อุตสาหกรรม หลอด อลูมิเนียม จำกัด (ATi)
ใช้แทน Google Form + Sheet "A.T.I ประวัติการซ่อมเครื่องจักร (FM-EN-07 rev.02)"

## ภาพรวม

```
มือถือ / คอมพิวเตอร์ ──► Vercel (React + API functions) ──► Apps Script Web App ──► Google Sheet ของระบบ
                                   │                                                   └─► Google Drive (รูปแจ้งซ่อม)
                                   └─ ตรวจล็อกอิน (รหัสพนักงาน + PIN / Google) และสิทธิ์ตามบทบาท
```

| บทบาท | ทำอะไรได้ |
|---|---|
| ผู้แจ้ง (requester) | แจ้งซ่อม (สแกน QR / เลือกเครื่อง), ติดตามงานของตน, ยืนยันผลซ่อม |
| ช่าง (technician) | ดูงานที่ได้รับ, เริ่ม/พัก/เสร็จ (จับเวลาอัตโนมัติ), บันทึกสาเหตุ การแก้ไข อะไหล่ |
| หัวหน้า (manager) | กระดานงาน, มอบหมายช่าง, จัดประเภท BM/CM/PM, ส่งประชุม RCA, Dashboard, จัดการผู้ใช้, พิมพ์ป้าย QR |
| ผู้บริหาร (executive) | Dashboard |
| ผู้ดูแลระบบ (admin) | ทุกอย่าง |

สถานะใบงาน: `new` รอรับงาน → `assigned` รอซ่อม → `working` กำลังดำเนินการ ⇄ `paused` รออะไหล่ → `done` รอยืนยัน → `closed` ปิดงาน
(แยก: `meeting` รอเข้าประชุม, `follow` ติดตามอาการ)

## ติดตั้งครั้งแรก

### 1) Google Sheet + Apps Script
1. สร้าง Google Sheet ใหม่ ตั้งชื่อ เช่น `ATi CMMS Database` (บัญชีนี้ต้องเปิดชีต FM-EN-07 ได้)
2. เมนู **Extensions › Apps Script** ลบโค้ดเดิม แล้ววางโค้ดจาก [`apps-script/Code.gs`](apps-script/Code.gs) กด Save
3. เลือกฟังก์ชัน `setup` แล้วกด **Run** (อนุญาตสิทธิ์ตามที่ Google ถาม)
   - สร้างแท็บ Users, Machines, Lists, WorkOrders, History
   - นำเข้าประวัติจากชีต FM-EN-07 และรายชื่อเครื่องจักร ระบบ รายการ ช่าง จากแท็บ List ข้อมูล
   - สร้างผู้ใช้ `admin` ผูกกับอีเมลของคุณ
   - สร้าง `API_KEY` (ดูได้จากเมนูในชีต **ATi CMMS › ดู API_KEY** หรือ Project Settings › Script properties)
4. **Deploy › New deployment** › ชนิด **Web app** · Execute as: **Me** · Who has access: **Anyone** › Deploy
5. คัดลอก **Web app URL** (ลงท้าย `/exec`)

> แก้ไขโค้ด Apps Script ภายหลัง ต้อง **Deploy › Manage deployments › Edit › New version** URL เดิมจะใช้ต่อได้

### 2) Vercel Environment Variables
Project › Settings › Environment Variables (ดูตัวอย่างใน [`.env.example`](.env.example))

| ตัวแปร | ค่า |
|---|---|
| `APPS_SCRIPT_URL` | Web app URL จากข้อ 1.5 |
| `APPS_SCRIPT_KEY` | ค่า `API_KEY` ใน Script properties |
| `SESSION_SECRET` | สตริงสุ่มยาว (ตั้งไว้ให้แล้ว) |
| `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID` | OAuth Client ID (ถ้าจะใช้ล็อกอินด้วย Google) |
| `ALLOWED_EMAIL_DOMAINS` | โดเมนอีเมลบริษัท (ไม่บังคับ) |

ตั้งค่าเสร็จแล้วกด **Redeploy**

### 3) ล็อกอินด้วย Google (ไม่บังคับ)
1. Google Cloud Console › APIs & Services › Credentials › Create credentials › **OAuth client ID** › Web application
2. Authorized JavaScript origins: ใส่โดเมน Vercel ของระบบ (เช่น `https://ati-engineering-cmms.vercel.app`)
3. นำ Client ID ไปใส่ทั้ง `GOOGLE_CLIENT_ID` และ `VITE_GOOGLE_CLIENT_ID` แล้ว Redeploy

ถ้ายังไม่ตั้ง Google Sign-In: เปิด Google Sheet ของระบบ (รีเฟรชหนึ่งครั้ง) › เมนู **ATi CMMS › ตั้ง PIN ผู้ใช้** › ใส่ `admin` และ PIN แล้วเข้าระบบด้วยรหัส `admin`

### 4) เริ่มใช้งาน
1. เข้าระบบด้วย admin › เมนู **ผู้ใช้งาน** › เพิ่มหัวหน้า/ช่าง/ผู้แจ้ง และตั้ง PIN
2. ตรวจแท็บ **Machines** ในชีต (คอลัมน์ line เดาจากรหัสเครื่อง แก้ไขได้)
3. เมนู **เครื่องจักร** › เลือกเครื่อง › **พิมพ์ป้าย QR** › ติดที่เครื่อง
4. แนะนำทดลองใช้คู่กับ Google Form เดิม 1–2 ไลน์ ก่อนเลิกใช้ฟอร์มเดิม

## พัฒนาต่อ

```bash
npm install
npm run build      # build หน้าเว็บไปที่ dist/
```
โฟลเดอร์ `api/` คือ Vercel Functions (Node) · `src/` คือหน้าเว็บ React + Tailwind · `apps-script/` คือโค้ดฝั่ง Google Sheet

### ข้อจำกัดที่ทราบ
- รูปภาพเก็บใน Google Drive แบบ "ทุกคนที่มีลิงก์ดูได้" เพื่อให้แสดงในแอปได้
- ยังไม่มีแจ้งเตือน LINE, แผน PM และสต็อกอะไหล่ (เฟส 2)
- ทุกคำขอผ่าน Apps Script ใช้เวลาประมาณ 1–2 วินาที
