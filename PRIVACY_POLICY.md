# Privacy Policy for Markopy

**Last Updated:** December 2025

## Introduction

Markopy ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our Chrome browser extension.

## Information We Collect

### Data Stored Locally

Markopy stores the following data **locally on your device** (in Chrome's local storage):

- **Clipboard History**: Copies of text you've copied using the extension (stored locally, never transmitted)
- **Templates**: Custom templates you create
- **Settings**: Your preferences (themes, templates, etc.)
- **Usage Statistics**: Time saved, number of copies (for your reference only)
- **License Information**: If you purchase Premium, your license key is stored locally for verification

**This data never leaves your device** and is not transmitted to our servers.

### Data Transmitted to Our Servers

We only transmit data in the following scenarios:

#### Premium License Verification
- **User ID**: A unique identifier used to associate a Premium license with you.
  - If you **link your email** (OTP sign-in), this is derived from your Supabase Auth user ID.
  - Otherwise, it may be a randomly generated identifier stored locally/synced by your browser.
- **License Key**: When you activate a Premium license, we verify it with our backend API
- **Purpose**: To verify your Premium license status and unlock premium features

#### Email Linking (Optional) – OTP Sign-in
- **Email Address**: If you choose to link your email, we send your email address to Supabase Auth to send you a one-time verification code.
- **Purpose**: To provide a stable identity so Premium can be activated across multiple devices/browser profiles.

#### Payment Processing (Stripe)
- **Payment Information**: Handled entirely by Stripe (we never see your card details)
- **Email Address**: If provided during checkout, used only for payment receipts
- **Purpose**: To process Premium purchases

**We do NOT collect (outside of the optional flows above):**
- Your browsing history
- URLs of pages you visit
- Personal information (name, email, etc.) unless you provide it during purchase or choose to link your email for Premium
- Any content you copy (this stays on your device)

## How We Use Your Information

- **License Verification**: To verify Premium license status
- **Payment Processing**: To process Premium purchases via Stripe
- **Service Improvement**: Anonymous usage statistics (if you opt-in) to improve the extension

## Third-Party Services

### Stripe
We use Stripe for payment processing. Stripe's privacy policy applies to payment data:
https://stripe.com/privacy

### Supabase
We use Supabase (PostgreSQL database) to store license information. Supabase's privacy policy:
https://supabase.com/privacy

### Vercel
Our backend API is hosted on Vercel. Vercel's privacy policy:
https://vercel.com/legal/privacy-policy

## Data Security

- All data transmission uses HTTPS encryption
- License keys are stored securely in your browser's local storage
- We use industry-standard security practices
- Payment information is handled by Stripe (PCI DSS compliant)

## Your Rights

You have the right to:
- **Access**: View all data stored locally in the extension
- **Delete**: Clear all local data via the extension settings
- **Opt-out**: Stop using the extension at any time
- **Data Export**: Export your templates and settings (via extension UI)

## Data Retention

- **Local Data**: Stored on your device until you delete it or uninstall the extension
- **License Information**: Retained in our database for as long as your license is active
- **Payment Records**: Retained by Stripe according to their retention policy

## Children's Privacy

Markopy is not intended for users under 13 years of age. We do not knowingly collect information from children.

## Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last Updated" date. Continued use of the extension after changes constitutes acceptance.

## Contact Us

If you have questions about this Privacy Policy, please contact us:
- **Support Email**: Use the support email listed on the Chrome Web Store listing for Markopy.

## Compliance

This extension complies with:
- **GDPR** (General Data Protection Regulation) - EU users
- **CCPA** (California Consumer Privacy Act) - California users
- **Chrome Web Store Policies**

## Data Processing Location

- **Backend API**: Hosted on Vercel (may be in US/EU depending on region)
- **Database**: Supabase (EU region available)
- **Payment Processing**: Stripe (global, compliant with local regulations)

For EU users: We process data in compliance with GDPR. Your data may be processed outside the EU, but we ensure adequate safeguards are in place.

---

**Summary**: Markopy respects your privacy. Your copied content stays on your device. We only collect minimal data necessary for Premium license verification and payment processing.

