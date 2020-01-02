
## Quick setup

```
git clone https://github.com/renyuanz/leonids
cd leonids
jekyll server
```

Check out your awesome blog at `http://localhost:4000` and Cheers!

## Running with Docker

```
docker run --rm -it --volume=$PWD:/srv/jekyll -p 4000:4000 jekyll/jekyll:pages jekyll serve --watch --force_polling
```

## Resume Page by [@Skn0tt](https://github.com/Skn0tt)
Leonids features a simple resume page. It is divided up into five sections:

* Bio (Edit \_data/index/careers.yml)
* Education (Edit \_data/index/education.yml)
* Skills (Edit \_data/index/skills.yml)
* Projects (Edit \_data/index/projects.yml)
* About (Edit \_includes/sections/about.html)

You can put all your info into these files, and they will be featured on the resume page.

## TODO

- [ ] Redesign categories page. Ref: [dribbble: blog category section By Ilja Miskov](https://dribbble.com/shots/2274792-Blog-Category-Selection)
- [ ] Multi languages support.
