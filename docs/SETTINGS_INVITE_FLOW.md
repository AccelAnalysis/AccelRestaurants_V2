# Settings Invite Flow Implementation Checklist

## Overview
Implement organization member invite and join flows in the Admin Dashboard settings. Follow AccelRestaurants brand guidelines: clean, modern UI with slate/blue accents, consistent typography, and intuitive interactions. Key principles: new signups become `orgAdmin`, invited users become `user`, single-org model, MFA stub with "Coming Soon".

## Role Model
### Roles
- `orgAdmin`: Full org permissions (manage info, invites, seats, billing, roles, removals).
- `user`: Limited to own account/profile; read-only org visibility.

### Invite → Signup Linkage
- Invite creates pending record tied to org.
- Invited user signs up: linked to org, `platformRole = "user"`, invite marked "accepted".
- Direct signups: `platformRole = "orgAdmin"`.

## Data Model Changes
### Firestore Collections
- `orgs/{orgId}`:
  - `members/{uid}`: Membership record with role, status, createdAt, createdBy.
  - `invites/{inviteId}`: Pending invites.
  - `auditLogs/{logId}`: Admin actions (invites, roles, etc.).
- `users/{uid}`: User profile (name, orgId, platformRole echo for reads).

### Invitation Schema
- `email` (lowercased)
- `role` (default: `"user"`)
- `status`: `"pending" | "accepted" | "revoked" | "expired"`
- `invitedByUid`
- `createdAt`, `expiresAt` (+7 days)
- `tokenHash` (hashed, not raw)
- `acceptedByUid`, `acceptedAt` (on accept)

### Membership Schema
- `role`: `"orgAdmin" | "user"`
- `status`: `"active" | "deactivated"`
- `createdAt`, `createdBy`

## Firestore Rules Changes
- **Orgs Collection**:
  - Allow `orgAdmin` to create/update invites, manage members.
  - Allow members to read org data.
- **Invites Subcollection**:
  - Read/write by `orgAdmin`; read by invitee via token (secure).
- **Members Subcollection**:
  - Read by members; write by `orgAdmin` or callable functions.
- **Users Collection**:
  - Read own profile; `orgAdmin` can update roles for org members.
- **Security Note**: Never allow direct client writes for memberships/invites acceptance. Use callable functions for sensitive ops.

## Functions (Firebase Cloud Functions)
- **sendInviteEmail**: Callable to send invites via email (SendGrid/Mailgun).
  - Input: emails[], role, custom message.
  - Creates invite docs, sends emails with secure tokens.
- **acceptInvite**: Callable for acceptance (transactional).
  - Validates token/email, checks seats/expiry, creates membership, updates user profile, marks invite accepted, logs audit.
- **revokeInvite**: Callable to revoke pending invites (by `orgAdmin`).
- **resendInvite**: Resends email for pending invites.
- **updateMemberRole**: Callable to change roles (with re-auth guardrails).
- **deactivateMember**: Callable to deactivate/remove members (guard last `orgAdmin`).

## Routes
- **Settings Page**: `/admin/settings` (new in AdminDashboard).
- **Sub-routes**:
  - `/admin/settings/my-account` (Profile, Security, Notifications, Data & Privacy).
  - `/admin/settings/organization` (Profile, Members, Invitations, Seats & Plan, Billing, Security, Audit Log, Danger Zone) - `orgAdmin` only.
- **Public Routes**:
  - `/join?token=...` (Invite acceptance page).
  - `/join?token=...&email=...` (Prefilled).

## UI Pages & Components
### Global Settings Layout
- **Header**: Left "Settings", Right: Org name (read-only) + user avatar menu.
- **Left Nav**: Tabs for My Account (all users) and Organization (`orgAdmin` only).
- **Design**: Card sections, primary/secondary actions, brand styling (neutral-900 bg, neutral-800 cards, orange accents, Inter typography, 6px radius, 40px inputs).

### 1) My Account (All Users)
#### A. Profile
- **Personal Info Card**: Name, Email (read-only/verified), Phone, Time Zone.
- **Account Context Card**: Org (read-only), Role badge (read-only).
- **Avatar Card**: Upload/remove.

#### B. Security
- **Password Card**: Change/reset.
- **Sessions Card**: Current/recent, sign out all.
- **MFA Card**: Stub ("Coming soon", disabled controls).

#### C. Notifications
- Toggles for email/in-app notifications.

#### D. Data & Privacy
- Export data, deactivate/delete (guard if only `orgAdmin`).

### 2) Organization (`orgAdmin` Only)
#### A. Organization Profile
- **Org Info Card**: Name, Logo, Contact Email, Address.
- **Operational Card**: Time Zone, Branding rules.
- Actions: Save, Cancel.

#### B. Members
- Table: Name, Email, Role, Status, Last Active.
- Row Actions: Change Role, Deactivate/Remove.
- Guardrails: Prevent last `orgAdmin` removal, re-auth for escalations.

#### C. Invitations
- Table: Email, Role, Invited By, Date, Status.
- Actions: Resend, Revoke.
- **Invite Modal**: Emails (multi), Role (default user), Seat indicator, Send.

#### D. Seats & Plan
- **Usage Card**: Purchased/Used/Pending.
- **Manage Card**: Add/Reduce seats.
- **Plan Card**: Current, Upgrade/Downgrade.

#### E. Billing & Payments
- **Payment Card**: Card, Billing info.
- **Invoices Card**: List/download.
- **Changes Card**: Upgrade/Cancel with confirmations.

#### F. Security
- **Auth Card**: MFA toggle (stub), Verified email.
- **Controls Card**: Invite restrictions, session policy (stub).

#### G. Audit Log
- Filters: Date, Actor, Action.
- Events: Invites, Roles, Removals, Changes.

#### H. Danger Zone
- **Transfer Admin Card**: Promote user.
- **Delete Org Card**: Confirmation, re-auth.

### Invite/Join Flow UI
#### Invite Email
- Premium layout: Logo, title, inviter, CTA button, security footer, expiration.

#### Join Page (`/join`)
- **States**:
  - Not signed in: Tabs for Create Account/Sign In (prefill email if provided).
  - Signed in matching: Accept button.
  - Wrong email: Error, sign out option.
  - Invalid: Error, request new invite.
- **Acceptance**: Loading steps, success banner, redirect to dashboard.

#### Post-Join
- One-time toast: "Access set by admin", CTA to profile.

## Edge Cases
- **Seat Limits**: Block invites if full; error on accept if now full.
- **Expired/Revoked Invites**: Show error, allow resend/revoke.
- **Duplicate Emails**: Prevent multi-invites, handle existing accounts.
- **Role Guards**: Only `orgAdmin` can invite/manage; prevent self-escalation.
- **Last Admin**: Block demotion/removal without replacement.
- **Email Issues**: Handle bounces, rate limit resends.
- **Multi-Invite**: User can have multiple pending; accept one links to org.
- **Deactivation**: Soft delete; re-activate possible.
- **Audit Logging**: All admin actions logged.
- **MFA Stub**: Disabled with tooltips.

## Acceptance Criteria
- **Functional**:
  - Direct signups: `orgAdmin` role, own org.
  - Invites: Email sent, acceptance links user as `user`.
  - Settings UI: Role-based visibility, full CRUD for `orgAdmin`.
  - Invites: Create, resend, revoke; accept adds membership.
  - Security: All sensitive ops via callables; no direct client escalation.
- **UI/UX**:
  - Brand consistency: Colors, typography, layouts, icons.
  - Responsive, accessible, loading/error states, toasts.
  - Intuitive flows: Modal confirms, guardrail warnings.
- **Security**:
  - Rules enforce permissions; tokens hashed; re-auth for escalations.
  - No multi-org; single membership per user.
- **Performance**:
  - Lazy load tables; real-time updates.
  - Transactional writes for consistency.
- **Testing**:
  - Unit for functions/rules.
  - E2E for invite flow, settings CRUD.
  - Edge cases: Expiry, limits, permissions.
