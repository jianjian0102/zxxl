# Design Guidelines: Psychology Counseling Appointment Platform

## Design Approach
**Selected System**: Material Design principles with healthcare-focused customization
**Rationale**: Professional service requiring trust, clarity, and accessibility. Material Design provides robust form patterns and information hierarchy essential for complex intake forms.

## Core Design Elements

### Typography
- **Primary Font**: Inter or Noto Sans SC (excellent Chinese character support)
- **Headings**: 
  - H1: text-4xl font-semibold (Homepage hero, main section titles)
  - H2: text-2xl font-semibold (Section headers, form sections)
  - H3: text-xl font-medium (Subsections, card titles)
- **Body**: text-base leading-relaxed (form labels, announcements, descriptions)
- **Small Text**: text-sm (form hints, metadata, timestamps)

### Layout System
**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4 to p-8
- Section margins: my-8 to my-16
- Card spacing: gap-6 between elements
- Form field spacing: space-y-4 for vertical stacking

### Component Library

**Navigation**
- Sticky header with logo, main navigation links, and user/admin indicator
- Mobile: Hamburger menu with slide-out drawer
- Admin panel: Sidebar navigation for announcement management

**Calendar Component**
- Monthly grid view with clear date cells
- Available slots: Green indicator with time display
- Booked slots: Gray/disabled state with visual distinction
- Selected slot: Blue highlight with confirmation popup
- Time slot picker: Dropdown for available hours within selected date

**Forms (Critical for Intake)**
- **Input Fields**: Rounded borders (rounded-lg), generous padding (p-3), clear labels above fields
- **Radio/Checkboxes**: Large touch targets (min 44px), clear visual states
- **Dropdowns**: Native select with custom styling for consistency
- **Textarea**: Minimum 4-5 rows for detailed situation description
- **Date Picker**: Calendar popup for birth date selection
- **Multi-select**: Checkbox group for concern topics with 2-column grid on desktop
- **Agreement Checkboxes**: Larger text (text-base), expandable text for full terms

**Cards**
- Announcement cards: White background, shadow-sm, rounded-lg, p-6
- Feature overview cards: Icon + title + description, grid layout (2-3 columns desktop)
- Appointment type cards: Prominent visual distinction between regular and discounted counseling

**Buttons**
- Primary CTA: Large (px-8 py-3), rounded-lg, used for "Submit Appointment"
- Secondary: Outlined style for "Cancel" or alternative actions
- When on images: Add backdrop-blur-sm bg-white/20 to button backgrounds

**Messaging Interface**
- Chat-style conversation view with message bubbles
- Client messages: Align left, light background
- Counselor replies: Align right, distinct background
- Input field: Sticky bottom bar with send button

### Page Structures

**Homepage**
- Hero section: Professional headshot photo (circular, centered), name, credentials, brief tagline (60-80vh)
- Services overview: 2-column grid showcasing regular vs. public welfare counseling
- How it works: 4-step process cards (Choose → Schedule → Complete Form → Confirm)
- About section: Detailed bio, qualifications, approach
- CTA section: Prominent "Book Appointment" button

**Booking Flow**
1. Service selection page: Large cards comparing two options
2. Calendar view: Full-width calendar with clear time slot selection
3. Intake form: Single-column layout, grouped sections with clear headings
   - Personal info section
   - Background section (medical history)
   - Consultation focus section (multi-select grid)
   - Agreement section (checkboxes with modal for full text)
4. Confirmation page: Summary card with edit capability

**Announcement Board**
- Public view: Card grid (1 column mobile, 2 columns tablet+)
- Admin view: Add/Edit interface with rich text editor, delete confirmation

**Messaging**
- Split view on desktop: Conversation list (left 30%) + active chat (right 70%)
- Mobile: Full-screen chat with back navigation

### Images
- **Hero Image**: Professional counselor photo - circular frame (w-48 h-48 on mobile, w-64 h-64 desktop), centered above name
- **Service Cards**: Optional illustrative icons (mental health themed)
- **About Section**: Additional professional photo or office environment (rectangular, max-w-md)

### Accessibility & Localization
- High contrast ratios for text (4.5:1 minimum)
- Clear focus states on all interactive elements (ring-2)
- ARIA labels for calendar navigation
- Chinese language throughout interface
- Form error messages in red with icon indicators

### Responsive Behavior
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Calendar: Compact month view on mobile, expanded on desktop
- Forms: Single column on mobile, strategic 2-column on desktop for related fields
- Max container width: max-w-7xl for main content areas

This design creates a trustworthy, accessible platform that balances professional credibility with warmth and approachability essential for mental health services.