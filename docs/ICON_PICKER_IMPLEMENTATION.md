# Icon Picker Implementation

## Overview
Implemented a curated icon picker component that allows users to select custom icons for projects and apps. This provides better visual distinction and personalization.

## Changes Made

### 1. IconPicker Component (`apps/dashboard/admin/src/components/IconPicker.tsx`)
- Created reusable IconPicker component with 15 curated icons
- Dropdown UI with visual icon preview and selection state
- Exports `AVAILABLE_ICONS`, `getIconById()` helper function
- Default icons: "folder" for projects, "application" for apps

### 2. Database Schema (`apps/packages/db/src/schema.ts`)
- Added `icon` column to `projects` table (varchar(50), default: "folder")
- Added `icon` column to `apps` table (varchar(50), default: "application")
- Migration generated: `0001_dusty_stone_men.sql`

### 3. Projects Integration
**Files Updated:**
- `apps/dashboard/admin/src/pages/Projects.tsx`
  - Added IconPicker to project creation form
  - Updated project cards (grid view) to display selected icons
  - Updated project table (table view) to display selected icons
  - Replaced first-letter avatars with icon display

- `apps/dashboard/admin/src/App.tsx`
  - Updated project selector in sidebar to show selected icons
  - Updated project dropdown items to show icons instead of first letter

### 4. Apps Integration
**Files Updated:**
- `apps/dashboard/admin/src/pages/AppSetup.tsx`
  - Added IconPicker to app creation form (Step 1)
  - Default icon: "application"

- `apps/dashboard/admin/src/pages/ProjectDetail.tsx`
  - Updated apps table to display selected icons
  - Replaced hardcoded Application01Icon with dynamic icon lookup

## Available Icons

1. Application01Icon - "application" (default for apps)
2. GridIcon - "grid"
3. WindowIcon - "window"
4. Code01Icon - "code"
5. DatabaseIcon - "database"
6. Cloud01Icon - "cloud"
7. Rocket01Icon - "rocket"
8. SecurityCheckIcon - "security"
9. ShieldCheckIcon - "shield"
10. PackageIcon - "package"
11. Box01Icon - "box"
12. Folder01Icon - "folder" (default for projects)
13. FlashIcon - "flash"
14. StarIcon - "star"
15. SettingsIcon - "settings"

## Usage

### In Forms
```tsx
<IconPicker
  selectedIconId={formData.icon}
  onSelect={(icon) => setFormData({ ...formData, icon })}
  label="Project Icon"
/>
```

### Displaying Icons
```tsx
import { getIconById } from "../components/IconPicker";

<Icon icon={getIconById(project.icon || "folder")} size={20} />
```

## Database Migration

Run the migration to add icon columns:
```bash
cd apps/packages/db
pnpm drizzle-kit push
```

SQL changes:
```sql
ALTER TABLE "apps" ADD COLUMN "icon" varchar(50) DEFAULT 'application' NOT NULL;
ALTER TABLE "projects" ADD COLUMN "icon" varchar(50) DEFAULT 'folder' NOT NULL;
```

## Design Decisions

1. **Curated List**: Used 15 pre-selected icons instead of full library for better UX
2. **Defaults**: Sensible defaults ("folder" for projects, "application" for apps)
3. **Storage**: Icon ID stored as varchar (e.g., "application", "folder")
4. **Display**: Helper function `getIconById()` maps ID to icon component
5. **Fallback**: Always falls back to default icon if ID not found

## Visual Improvements

- Replaced gradient avatars with icon displays
- Consistent icon styling: `bg-primary/10` with `text-primary`
- Icons shown in:
  - Project/app creation forms
  - Project cards and tables
  - App tables
  - Sidebar project selector
  - Project dropdown menu

## Future Enhancements

- Allow icon customization in project/app settings (edit mode)
- Add more curated icons based on user feedback
- Consider icon color customization
- Add icon search/filter in picker for larger icon sets
