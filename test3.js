const url =
  'https://api.codetabs.com/v1/proxy?quest=' +
  encodeURIComponent(
    'https://store.steampowered.com/api/storesearch/?term=cyberpunk&l=french&cc=FR'
  )
fetch(url)
  .then((res) => res.text())
  .then((text) => console.log(text.substring(0, 200)))
  .catch((err) => console.error(err))
