# HYPRECISION_TECH_ — Chrollo AI Assistant

Organized data platform for **Hyprecision Technologies**, featuring **Chrollo** — a dedicated AI assistant built to streamline data access, inventory management, and administrative workflows.

---

## Overview

This repository houses the full-stack TypeScript application powering Hyprecision Technologies' internal assistant and data dashboard. Generated from the `google-gemini/aistudio-repository-template`, the project combines a Vite-powered frontend with a custom TypeScript backend (`server.ts`), admin authentication, and interactive UI motion.

---

## Key Features

- **Chrollo AI Assistant:** Conversational interface tailored for querying and interacting with organized Hyprecision Technologies datasets.
- **Admin Authentication:** Role-based access control protecting administrative views and sensitive operational data.
- **Inventory & Tray Views:** Structured interfaces for tracking inventory items and tray statuses (see UI previews in the repository root).
- **Smooth UI Motion:** Animated transitions and responsive layouts built for desktop workflows.

---

## Tech Stack

- **Language:** TypeScript (99.4%)
- **Frontend:** Vite, HTML5, CSS/Motion, Python
- **Backend:** Node/Bun (`server.ts`)
- **Package Manager:** Bun (`bun.lock`)

---

## Project Structure

```text
HYPRECISION_TECH_/
├── data/                    # Organized datasets for Hyprecision Technologies
├── public/                  # Static public assets
├── src/                     # Frontend application source code & components
├── .env.example             # Environment variable template
├── index.html               # Application entry point
├── metadata.json            # Project and AI Studio metadata
├── package.json             # Dependencies and scripts
├── server.ts                # Backend server and API endpoints
├── tsconfig.json            # TypeScript configuration
└── vite.config.ts           # Vite bundler configuration
