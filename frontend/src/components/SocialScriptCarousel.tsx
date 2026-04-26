"use client";

type SocialScriptTone = "Direct Approach" | "Soft Pivot" | "Humorous Out";

type SocialScriptCard = {
  tone: SocialScriptTone;
  reply: string;
  caption: string;
};

type SocialScriptCarouselProps = {
  prompt: string;
  hasAttachmentContext?: boolean;
  onCopy?: (label: string) => void;
};

function trimPrompt(prompt: string) {
  return prompt
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.?!]+$/, "");
}

function buildSocialScripts(
  rawPrompt: string,
  hasAttachmentContext: boolean,
): SocialScriptCard[] {
  const prompt = trimPrompt(rawPrompt);
  const contextHint = hasAttachmentContext
    ? " I also peeped the context you attached."
    : "";

  if (!prompt) {
    return [];
  }

  return [
    {
      tone: "Direct Approach",
      caption: "Clear, confident, zero confusion",
      reply: `ngl I'm just gonna say it straight: ${prompt}.${contextHint} I'd be down, but I wanna keep it real and not overcomplicate it.`,
    },
    {
      tone: "Soft Pivot",
      caption: "Gentle redirect with good vibes",
      reply: `lowkey I get where this is coming from.${contextHint} I'm kinda leaning toward a softer move though, so maybe let's shift this into something that feels easier for both of us.`,
    },
    {
      tone: "Humorous Out",
      caption: "Playful escape hatch that still lands",
      reply: `tbh my brain said "${prompt}" and then immediately opened 37 tabs 😭${contextHint} I'm gonna tap out gracefully before this turns into a full side quest.`,
    },
  ];
}

export default function SocialScriptCarousel({
  prompt,
  hasAttachmentContext = false,
  onCopy,
}: SocialScriptCarouselProps) {
  const cards = buildSocialScripts(prompt, hasAttachmentContext);

  if (!cards.length) {
    return null;
  }

  return (
    <section className="social-carousel" aria-label="Social script generator">
      <div className="social-carousel__header">
        <div>
          <p className="social-carousel__eyebrow">Social Script Generator</p>
          <h3 className="social-carousel__title">3 ways Clizel would text it</h3>
        </div>
        <span className="social-carousel__hint">Swipe me →</span>
      </div>

      <div className="social-carousel__track">
        {cards.map((card) => (
          <article key={card.tone} className="social-card">
            <div className="social-card__top">
              <div>
                <p className="social-card__label">{card.tone}</p>
                <p className="social-card__caption">{card.caption}</p>
              </div>
              <button
                type="button"
                className="social-card__copy"
                onClick={async () => {
                  await navigator.clipboard.writeText(card.reply);
                  onCopy?.(card.tone);
                }}
              >
                Copy
              </button>
            </div>
            <p className="social-card__reply">{card.reply}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
