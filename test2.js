const url =
  'https://corsproxy.io/?' +
  encodeURIComponent(
    'https://store.steampowered.com/api/storesearch/?term=cyberpunk&l=french&cc=FR'
  )
fetch(url)
  .then((res) => res.text())
  .then((text) => console.log(text))
  .catch((err) => console.error(err))
