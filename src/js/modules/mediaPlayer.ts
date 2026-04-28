/**
 * iVelt Pro — Embedded Media Player.
 *
 * Replaces Google Drive / Dropbox file links inside post content with
 * an inline player. Sized SMALL by default; expands to full size when
 * the user starts playing (or clicks the expand button on Drive iframes).
 */

export function setupMediaPlayer() {
  const postContents = document.querySelectorAll(".postprofile + .postbody .content, #preview .postbody .content");

  for (const contentDiv of postContents) {
    const mediaLinks = contentDiv.querySelectorAll(`
      .content > a[href^="https://drive.google.com/file/d/"],
      .content > :not(blockquote) a[href^="https://drive.google.com/file/d/"],
      .content > a[href^="https://www.dropbox.com/scl/fi/"][href$="&dl=0"]:is([href*=".mp3"], [href*=".mp4"], [href*=".mov"], [href*=".m4a"], [href*=".m4v"], [href*="webm"]),
      .content > :not(blockquote) a[href^="https://www.dropbox.com"][href$="&dl=0"]:is([href*=".mp3"], [href*=".mp4"], [href*=".mov"], [href*=".m4a"], [href*=".m4v"], [href*="webm"])
    `);
    if (!mediaLinks.length) continue;

    const mediaItems = Array.from(mediaLinks).map(link => {
      const href = link.getAttribute("href");
      if (!href) return null;

      let id, type, filename;
      if (href.startsWith("https://drive.google.com")) {
        const m = /^https:\/\/drive.google.com\/file\/d\/([^/]+)/.exec(href);
        if (m) { id = m[1]; type = "google-drive"; }
      } else if (href.startsWith("https://www.dropbox.com")) {
        const m = /^https:\/\/www.dropbox.com\/scl\/fi\/([^/]+)\/(.+?)\?(.+)\&dl=0/.exec(href);
        if (m) { id = `${m[1]}/${m[2]}?${m[3]}`; filename = m[2]; type = "dropbox"; }
      }
      if (!type) return null;
      return { title: link.textContent || href, href, id, filename, type };
    }).filter(Boolean) as Array<{ title:string; href:string; id:string; filename?:string; type:string }>;

    if (mediaItems.length === 0) continue;

    const root = document.createElement('div');
    root.className = 'ivelt-pro-media-root';

    mediaItems.forEach(item => {
      const downloadHref = item.type === "google-drive"
        ? `https://drive.google.com/uc?export=download&id=${item.id}`
        : `https://www.dropbox.com/scl/fi/${item.id}&dl=1`;

      const wrap = document.createElement('div');
      wrap.className = 'media-item';
      const isAudio = !!item.filename?.endsWith('.mp3');
      const cont = document.createElement('div');
      cont.className = `media-container ${isAudio ? 'is-audio' : ''}`;

      const expand = () => cont.classList.add('is-expanded');

      if (item.type === 'google-drive') {
        // Drive iframes are cross-origin → can't observe `play`.
        // Use TWO triggers (whichever fires first):
        //   a) `mousedown` on the container BEFORE the click reaches the iframe
        //      (capture phase, while we still own the event)
        //   b) Window blur + activeElement === iframe (covers keyboard/touch)
        cont.innerHTML = `
          <iframe src="https://drive.google.com/file/d/${item.id}/preview"
                  frameborder="0" loading="lazy" scrolling="no" allowfullscreen></iframe>
        `;
        const iframe = cont.querySelector('iframe') as HTMLIFrameElement;

        // (a) mousedown captures the very first interaction with the player area
        cont.addEventListener('mousedown', expand, { capture: true, once: true });

        // (b) blur fallback for when the click lands directly inside the iframe
        const onBlur = () => {
          setTimeout(() => {
            if (document.activeElement === iframe) {
              expand();
              window.removeEventListener('blur', onBlur);
            }
          }, 0);
        };
        window.addEventListener('blur', onBlur);
      } else {
        cont.innerHTML = `
          <video controls preload="metadata" data-filename="${item.filename || ''}">
            <source src="https://www.dropbox.com/scl/fi/${item.id}&dl=1"/>
          </video>
        `;
        const video = cont.querySelector('video') as HTMLVideoElement;
        // Multiple triggers: any of these reliably means "user is using the player".
        video.addEventListener('play', expand);
        video.addEventListener('click', expand);
        cont.addEventListener('click', expand);
      }

      const links = document.createElement('div');
      links.className = 'media-links';
      links.innerHTML = `
        <a class="button" href="${downloadHref}" target="_blank" rel="noopener noreferrer">
          <i class="icon fa-download"></i> דאונלאוד
        </a>`;

      wrap.appendChild(links);
      wrap.appendChild(cont);
      root.appendChild(wrap);
    });

    contentDiv.insertAdjacentElement('afterend', root);
  }
}
