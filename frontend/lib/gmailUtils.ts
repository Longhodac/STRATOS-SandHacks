/**
 * Gmail compose URL utilities
 */

export interface GmailComposeOptions {
  to: string;
  subject: string;
  body: string;
}

/**
 * Opens Gmail's compose window in a new tab with pre-filled fields.
 * Uses Gmail's compose URL format: https://mail.google.com/mail/?view=cm&fs=1&to=...&su=...&body=...
 */
export function openGmailCompose(options: GmailComposeOptions): void {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: options.to,
    su: options.subject,
    body: options.body,
  });

  window.open(`https://mail.google.com/mail/?${params.toString()}`, '_blank');
}

/**
 * Generates a default email subject line for sponsorship outreach.
 */
export function generateSponsorshipSubject(clubName: string, companyName: string): string {
  return `Partnership Opportunity - ${clubName} x ${companyName}`;
}

/**
 * Generates a default email subject line for club collaboration outreach.
 */
export function generateCollaborationSubject(clubName: string, targetClubName: string): string {
  return `Collaboration Opportunity - ${clubName} x ${targetClubName}`;
}
