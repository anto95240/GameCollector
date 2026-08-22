const steamUrl = 'https://store.steampowered.com/api/storesearch/?term=cyberpunk&l=french&cc=FR'
const proxies = [
  'https://api.allorigins.win/raw?url=' + encodeURIComponent(steamUrl),
  'https://thingproxy.freeboard.io/fetch/' + steamUrl,
  'https://api.codetabs.com/v1/proxy?quest=' + steamUrl,
]

Promise.any(
  proxies.map((url) =>
    fetch(url)
      .then((res) => res.text())
      .then((text) => ({ url, text }))
  )
)
  .then((res) => console.log('WON:', res.url, res.text.substring(0, 100)))
  .catch((err) => console.error('ALL FAILED', err))
