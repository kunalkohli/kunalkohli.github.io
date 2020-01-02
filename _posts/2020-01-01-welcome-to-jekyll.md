---
layout: post
title:  "Creating Blog using Jekyll"
date:   2020-01-01 15:07:19
categories: [tutorial, code]
comments: true
---
I always wanted a blog where I can put my ideas and projects I am doing and get feedback from people. I tried creating a rails app which would host my pages but due to lack of time I couldn't give much time to it. Finally I found Jekyll (recommended to me by my lead @ Shopify) which not just lets you create blog website but also lets you host sites right from your GitHub repositories. There are a lot of websites out there which can help you create a blog by dragging and dropping elements but my idea of blog was not just to share my views with people but to also learn web development.

If you are interested in learning `jekyll`, feel free to check this post and share your views.

<!--more-->

<b>Jekyll</b> is a static site generator. You give it text written in your favorite markup language and it uses layouts to create a static website. You can tweak how you want the site URLs to look like, what data gets displayed on the site, and more. Jekyll does what you tell it to do — no more, no less. It doesn't try to outsmart users by making bold assumptions, nor does it burden them with needless complexity and configuration. Put simply, Jekyll gets out of your way and allows you to concentrate on what truly matters: your content.

* install Jekyll - run this command in terminal to install jekyll (mac)
    {% highlight bash %}
      gem install jekyll bundler
    {% endhighlight %}


* Selecting theme for the blog <br>
  * visit [Jekyll Themes][jekyll-themes] to check all the themes available for use. you can also preview how a theme looks by clicking the theme and clicking live demo.

  * Once you have decide the theme, click on the github repo to get the link to copy the cloning link as shown in red below.

  <img src="https://i.ibb.co/VWFmg86/Screen-Shot-2020-01-01-at-8-24-51-PM.png" alt="drawing" style="width:450px;height:170px;"/>

  * Now go to terminal and enter the below command:
        {% highlight bash %}
          git clone <copied_link>
        {% endhighlight %}
    
* Once the repository has been cloned, do a cd into it and run the below command:
  {% highlight bash %}
    bundle install
    bundle exec jekyll serve
  {% endhighlight %}

* Fire up a browser and open the below link:
  {% highlight html %}
  {% raw %}
    http://localhost:4000/
  {% endraw %}
  {% endhighlight %}
  
* To add things to the resume section, edit the following files:
  {% highlight html %}
  {% raw %}
    1. For about section : edit about.yml in _includes/sections/
    2. For career section : edit careers.yml in _data/index/
    3. For education section : edit education.yml in _data/index/
    4. For projects section : edit projects.yml in _data/index/
    5. For skills section : edit skills.yml in _data/index/
{% endraw %}
{% endhighlight %}

* To change the image, blog name and add social media on the homepage, edit <b>_config.yml </b> file.

* To add a new blog post, just add a blank markdown with the name of your choice inside <b>_posts/ </b>, and then add content to it

* run the server to see if the changes you did are visible on the page.



Check out the [Jekyll docs][jekyll] for more info on how to get the most out of Jekyll. File all bugs/feature requests at [Jekyll’s GitHub repo][jekyll-gh]. If you have questions, you can ask them on [Jekyll’s dedicated Help repository][jekyll-help].

[jekyll-themes]: https://jekyllthemes.io/jekyll-blog-themes
[jekyll]:      http://jekyllrb.com
[jekyll-gh]:   https://github.com/jekyll/jekyll
[jekyll-help]: https://github.com/jekyll/jekyll-help
