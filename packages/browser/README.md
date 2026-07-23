# Cossistant Browser Runtime

`@cossistant/browser` is the browser embed layer for the Cossistant support
widget.

It stays intentionally thin:
- `@cossistant/core` owns the runtime controller
- `@cossistant/react` remains the single widget authoring surface
- the embed bundle aliases React to Preact compat for smaller CDN assets

That means browser stays in lockstep with React by construction. When the React
widget changes, the browser widget updates on the next browser build and
release.

## Package surfaces

- Library/runtime entry:
  - `mountSupportWidget()`
- CDN embed build:
  - `loader.js`
  - `widget.js`
  - `widget.css`

## Browser embed characteristics

- mounts into a `ShadowRoot` by default
- injects `widget.css` into the shadow tree only
- preserves `--co-*` and `--co-theme-*` custom-property theming
- exposes `window.Cossistant.init()`, `show()`, `hide()`, `toggle()`,
  `identify()`, `updateConfig()`, `destroy()`, `on()`, and `off()`

## CDN usage

Load the latest widget from the CDN with:

```html
<script async src="https://cdn.cossistant.com/widget/latest/loader.js"></script>
<script>
  window.Cossistant.init({
    publicKey: "pk_live_..."
  });
</script>
```

The loader derives `widget.js` and `widget.css` from its own URL, so the
versioned form works the same way:

```html
<script async src="https://cdn.cossistant.com/widget/0.1.2/loader.js"></script>
```

## Release model

- `@cossistant/browser` is in the same Changesets fixed-version group as
  `@cossistant/core` and `@cossistant/react`
- GitHub Actions builds and uploads versioned embed assets to S3 + CloudFront
- the release workflow reuses the shared infra variables already used by app
  uploads:
  - `S3_REGION`
  - `S3_BUCKET_NAME`
  - `S3_CDN_BASE_URL`
  - `AWS_ROLE_ARN`
  - `CLOUDFRONT_DISTRIBUTION_ID`
- immutable versioned assets and a `latest/` alias are both published
