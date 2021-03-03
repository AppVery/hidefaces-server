export const emailsContent = {
  success: {
    name: "HideFaces.app",
    subject: "Video ready to download",
    text: "Hi, this is your temporary download link for your video.",
    getTitle(id: string): string {
      return `Video ${id} from ${this.name}`;
    },
    getClientText(url: string): string {
      return `${this.text} \n\n ${url}`;
    },
    getClientContent(url: string): string {
      return `${this.text}<br/><a href="${url}">Download video</a>`;
    },
    getAdminText(quantity: string): string {
      return `Success video with amount of ${parseInt(quantity) / 100}€`;
    },
    getAdminContent(quantity: string): string {
      return this.getAdminText(quantity);
    },
  },
  error: {
    name: "HideFaces.app",
    subject: "Unexpected video error",
    getTitle(id: string): string {
      return `Error in the video ${id} from ${this.name}`;
    },
    getClientText(): string {
      return `Unexpected error while processing the video, so we will analyze what happened and proceed to refund the money as soon as possible.`;
    },
    getAdminText(error: string): string {
      return `Error message: \n\n ${error}`;
    },
    getAdminContent(error: string, trace: string[]): string {
      return `<p>${error}</p><ul>${trace.map(
        (line) => `<li>${line}</li>`
      )}</ul>`;
    },
  },
  getFooter(): string {
    return `
    <div>
    <p><strong>How did we do it?</strong></p>
    <p>We hope we have been able to solve your need. We would love to hear from you, be it positive or constructive.</p>s
    <p>You can reply to this email to send us your comments. Thanks for your time. We appreciate it!</p>
    </div>
    <hr>
    <footer style="font-family: Verdana, Geneva, sans-serif; font-size: 12px; color: rgb(169, 169, 169);">
    <p>You are receiving this email because you requested a service on HideFaces.app</p>
    <p>AppVery - 31012 Pamplona (Navarra), Spain</p>
    </footer>`;
  },
};
