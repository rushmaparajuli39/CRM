# KRS Business Group — public website

A static site (plain HTML/CSS, no build step), kept separate from the CRM app
in the rest of this repo. Open `index.html` in a browser to preview it.

```
website/
  index.html            the page
  styles.css            all styling (brand colors are at the top)
  favicon.svg           browser-tab icon
  assets/logo-mark.svg  building + arc mark, redrawn as a crisp vector
  assets/krs-logo-full.jpg  the original full logo (used for social previews)
```

## Before going live — fill in (search for `EDIT:` in index.html)

1. **Contact details**: email, phone, office city/state.
2. **Stats**: "20 operating businesses / 3 industries". Confirm these numbers.
3. **Contact form**: out of the box it opens the visitor's email app. To get
   submissions emailed to you directly, sign up at https://formspree.io (free:
   50 submissions/month), create a form, and paste its URL into
   `data-endpoint=""` on the `<form>`.
4. **Social preview image**: once you have the domain, change the `og:image` meta
   tag to the full URL, e.g. `https://krsbusinessgroup.com/assets/krs-logo-full.jpg`.

## Domain (~$10–11/year)

Buy it at **Cloudflare Registrar** (dash.cloudflare.com → Domain Registration).
Cloudflare charges the wholesale price with no markup, and renewals stay the same
price. Other registrars often advertise $1 for the first year and then charge
$20+ to renew.

Ideas to check, in order: `krsbusinessgroup.com`, `krsgroup.com`, `krsbg.com`,
`krs-group.com`. Stick to `.com` if possible.

## Hosting: free on Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick the `rushmaparajuli39/CRM` repo and the `main` branch.
3. Build settings: Framework preset **None**, build command *(leave empty)*,
   build output directory **`website`**.
4. Deploy. You get a `*.pages.dev` URL right away.
5. **Custom domains → Set up a custom domain** → enter your domain. If you bought
   it at Cloudflare, DNS and HTTPS are set up for you automatically.

After that, every push to `main` that changes `website/` redeploys the site.

Commercial use is allowed on Cloudflare Pages' free plan, and bandwidth is
unlimited. (Vercel's free Hobby plan is for non-commercial use only.)

**Other options:** Netlify's free tier works the same way (publish directory
`website`). GitHub Pages also works, but it needs a public repo on the free plan.

## Business email (free)

Cloudflare **Email Routing** (free) can forward `info@yourdomain.com` to any
existing inbox, such as Gmail. If you need to send mail *from* that address,
Zoho Mail's free plan or Google Workspace (~$7/user/month) covers it.

## Optional: staff portal link

If the CRM is later hosted at something like `portal.yourdomain.com`, you can add
a "Staff Login" link to the nav in `index.html`.
