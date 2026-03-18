# UI/UX Design Specification: PG SaaS Management Tool

## 1. Visual Language & Theming

The overarching aesthetic is clean, data-forward, and minimalist, utilizing ample whitespace, rounded corners, and clear typographic hierarchy to reduce cognitive load. 

### 1.1 Color Palette & Dynamic Theming
As requested, the application will use a highly flexible theming engine relying on CSS Custom Properties (Variables) to allow the user to change the primary color at the device level. 

* **Dynamic Primary Color:** All core interactive elements (active sidebar links, primary buttons, focus rings, toggles) will map to a single CSS variable.
    * `--color-primary: [User Selected Hex]` (e.g., `#007BFF`, `#FF5722`, `#673AB7`)
    * `--color-primary-light: [User Selected Hex with 10-15% opacity]` (Used for active sidebar backgrounds or light badge backgrounds).
* **Semantic Colors (Fixed):**
    * **Success:** `#00C853` (Used for "Collected", "Sales", "Active")
    * **Danger:** `#FF5252` (Used for "Expenses", "Pending Dues", "Complaints")
    * **Warning:** `#FFAB00` (Used for "Notices", "Absences")
* **Neutral/Background Colors (Responsive to Light/Dark Mode):**
    * **Light Mode:** Background `--color-bg: #F8F9FA`, Surface/Cards `--color-surface: #FFFFFF`, Text `--color-text-main: #212529`.
    * **Dark Mode:** Background `--color-bg: #1A1A27`, Surface/Cards `--color-surface: #252538`, Text `--color-text-main: #E9ECEF`.

### 1.2 Typography
* **Font Family:** A clean, modern Sans-Serif (e.g., *Inter*, *Roboto*, or *SF Pro*).
* **Hierarchy:**
    * **H1 (Page Titles):** 24px, Bold (e.g., "Good evening, Suresh!").
    * **H2 (Card Values):** 28px - 32px, Bold (e.g., "₹50,000").
    * **H3 (Section Headers):** 14px, Semi-Bold, Uppercase, Tracking +1px (e.g., "QUICK ACTIONS").
    * **Body (Standard Text):** 14px, Regular (e.g., Form labels, data rows).
    * **Small (Subtext):** 12px, Regular, Muted color (e.g., "0 pending", "Here's how your business is doing today").

### 1.3 Geometry & Elevation
* **Border Radius:** * Cards & Modals: `12px` to `16px` for a soft, friendly feel.
    * Buttons & Inputs: `8px`.
* **Shadows:** Soft, diffused shadows on light mode cards (`box-shadow: 0 4px 12px rgba(0,0,0,0.05)`). Dark mode relies on surface color differentiation rather than shadows.

---

## 2. Global Layout & Navigation

The layout follows a classic web-app scaffold, optimized for responsiveness across desktop, tablet, and mobile.

### 2.1 The Sidebar (Left Navigation)
* **Desktop View:** Fixed width (approx. 240px). 
* **Mobile/Tablet View:** Collapses entirely behind a "Hamburger" menu icon in the top bar. Opens as an off-canvas overlay drawer.
* **Items (Mapped to PG Needs):** Dashboard, PG Properties, Rooms & Beds, Tenants, Payments, Documents, Complaints, Absences, Notices, Analytics, Settings.
* **Active State:** The selected menu item gets a very light tint of the `--color-primary` as its background, with the icon and text colored in the solid `--color-primary`.

### 2.2 The Top App Bar
* **Position:** Fixed at the top, spans the remaining width next to the sidebar.
* **Left Side:** Mobile hamburger menu (if on small screen), App Name + Organization Name (e.g., "PG Manager — Codvik.CRR").
* **Right Side Utilities:**
    * **Notifications (Bell Icon):** Opens a dropdown popover.
    * **Calculator (Calc Icon):** Opens the side-panel overlay calculator.
    * **Theme Toggle (Moon/Sun Icon):** Instantly switches between Light and Dark mode.
    * **Profile/Logout (Exit Icon).**

---

## 3. Core UI Components

### 3.1 Overview Cards (Dashboard Stats)
* **Structure:** Icon (top left), Title (middle), Large Value (bottom left), Subtext (bottom left below value).
* **Icons:** Enclosed in a soft rounded-square background (matching the icon's semantic color with 15% opacity). 
* **PG Context Examples:**
    * *Active Tenants:* Blue icon, "124", "3 moving out soon".
    * *Collected This Month:* Green icon, "₹2,50,000", "₹15,000 pending".
    * *Open Complaints:* Red/Warning icon, "4", "Needs attention".

### 3.2 Quick Action Buttons
* **Design:** White (or dark surface) background, `1px` solid border (very light grey), `12px` border radius. Arranged horizontally.
* **Content:** A centered icon above a concise label.
* **Hover State:** Border color shifts to `--color-primary`, subtle upward transform (`translateY(-2px)`), and a soft box-shadow.
* **PG Context Examples:** `+ Add Tenant`, `Record Payment`, `Add Expense`, `Log Complaint`.

### 3.3 Forms & Inputs (Adding Tenants/Expenses)
* **Style:** Floating labels or clean top-labels.
* **Borders:** `1px` solid neutral border. On focus, the border dynamically changes to `--color-primary` with a subtle primary-colored drop shadow/glow.
* **Dropdowns/Selects:** Include a search bar at the top of the dropdown menu for quickly finding properties or specific rooms.
* **Date Pickers:** Clean, native-looking calendar modals.

### 3.4 Overlays & Modals
* **Calculator:** Slides in from the right edge of the screen, taking up ~300px width. Fully functional overlay that doesn't disrupt the underlying workflow.
* **Modals:** Used for multi-step processes (like adding a new tenant with ID uploads). Dimmed background overlay (`rgba(0,0,0,0.5)`) with a centered, rounded-corner container.

---

## 4. Key Interactions & UX Details

* **Zero-State / Empty States:** If there are "No pending payments" or "No open complaints," display a light, muted icon with friendly text (e.g., "All caught up! No pending alerts").
* **Feedback Loops:** When a form is submitted (e.g., Expense added), trigger a brief "Toast" notification in the bottom center or top right of the screen (e.g., "Expense saved successfully").
* **Device-Level Color Persistence:** The dynamic primary color and Dark/Light mode preference must be saved to the user's local storage (`localStorage`) so their custom theme persists across sessions.