// Shared Instagram Send API helper — used by the webhook's own AI auto-reply
// and by the seller-initiated manual reply route, so both go through one
// real, tested path to Meta's API.
export async function sendInstagramDm(igAccountId: string, token: string, recipientId: string, text: string): Promise<boolean> {
    const res = await fetch(`https://graph.instagram.com/${igAccountId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
    });
    const data = await res.json();
    if (data.error) console.error("[Instagram] DM send failed:", data.error);
    return !data.error;
}
