# WhatsApp Blast SaaS Design System

## Product Personality

The product should feel:

* Fast
* Reliable
* Professional
* Operational
* Enterprise Ready

Avoid looking like an AI-generated admin template.

---

# Visual Style

Reference:

* Linear
* Resend
* Vercel
* Supabase

Keywords:

* Minimal
* Dense but readable
* Clean borders
* High information density

---

# Layout Rules

## Page Container

max-width: none

padding:

desktop: 24px

tablet: 20px

mobile: 16px

---

## Grid

Use:

gap-6

Avoid:

gap-10
gap-12

---

# Color System

Primary

#2563EB

Success

#16A34A

Warning

#F59E0B

Danger

#DC2626

Background

#F8FAFC

Surface

#FFFFFF

Border

#E5E7EB

---

# Radius

Button

10px

Input

10px

Card

14px

Modal

16px

---

# Typography

Font:

Inter

H1

30px
700

H2

24px
700

H3

20px
600

Body

14px

Small

13px

---

# Sidebar

Width

240px

Structure

Logo

Navigation

System Status

User Profile

---

# Navigation

Dashboard

Sessions

Groups

Blast

Campaigns

Settings

Never exceed 7 menu items.

---

# Dashboard

Section 1

System Overview

* Active Sessions
* Connected Devices
* Campaign Running
* Messages Today

Section 2

Recent Activity

Section 3

Campaign Analytics

---

# Session Page

Use card layout.

Card contains:

Phone Number

Status

Battery

Connection Time

Last Activity

Quick Actions

Do not use table layout.

---

# Group Management

Use table layout.

Features:

Search

Bulk Import

Filter

Pagination

---

# Blast Page

Use Wizard Layout.

Step 1

Select Session

Step 2

Select Audience

Step 3

Compose Message

Step 4

Review

Step 5

Send

---

# Campaign Page

Use Hybrid Layout.

Top:

Campaign Summary

Bottom:

Campaign Table

---

# Empty States

Every page must contain:

Icon

Title

Description

Action Button

---

# Loading

Use Skeleton Loader.

Never use full-screen spinner.

---

# Animations

Duration:

150ms

200ms

Maximum:

250ms

---

# Dark Mode

Required.

All colors must use CSS variables.

Never hardcode colors inside components.

# Elevation & Shadows

The interface should prioritize borders over shadows.

Use shadows only to communicate elevation.

Shadow Levels:

Card
shadow-sm

Dropdown
shadow-md

Modal
shadow-lg

Hover State
Increase one shadow level only

Rules:

* Avoid shadow-xl and shadow-2xl
* Avoid black shadows
* Use subtle layered shadows
* Most components should remain border-first

Example Philosophy:

Linear
Vercel
Resend

Use depth sparingly.

---

# Glass Surface Rules

Glass effects are allowed only for floating UI.

Allowed:

* Modal
* Sticky Header
* Command Palette
* Notification Drawer

Style:

background:
rgba(255,255,255,0.8)

backdrop-filter:
blur(12px)

border:
1px solid rgba(255,255,255,0.2)

Not Allowed:

* Data Tables
* Cards
* Sidebar
* Forms
* Dashboard KPI Cards

Reason:

Operational data must remain highly readable.

Glass effects should enhance focus, not reduce clarity.

