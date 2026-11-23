---
permalink: /about/
layout: layouts/page.njk
crumb: "About"
title: "About Just A Food Blog"
description: "Just A Food Blog shares clear food lists for special diets, written by pharmacist Lilian Porto and checked against health institutions."
---
Just A Food Blog publishes clear food lists for special diets. For each condition, you get a direct answer, a sample of foods to eat, limit and avoid, the reasons behind each food group, and the sources we checked.

## A new site on a familiar name

This domain once hosted a different recipe blog. Just A Food Blog is a new project under new ownership, with all-new content.

## Who writes it

<div class="author-card" id="lilian-porto">
{{ img(site.author_profile.photo, site.author_profile.name, { widths: [96, 192], sizes: "96px" }) | safe }}
<div>
<h2>{{ site.author_profile.name }}, {{ site.author_profile.title }}</h2>
<p>{{ site.author_profile.bio }}</p>
<p>Just A Food Blog is part of <a href="{{ site.shop_url }}">The Shop Curator</a>, a shop that creates printable food lists, food charts, grocery lists and meal plans for special diets.</p>
</div>
</div>

## What we do (and don't do)

- **We sort foods into eat, limit and avoid**, with a portion for every food in the limit column.
- **We show our sources.** Every page lists the health institutions it relies on, so you can check them yourself.
- **We keep the guides free.** The complete food list, food chart, grocery list and meal plan with recipes are available as printables on Etsy.
- **We don't give medical advice.** Diets vary from person to person. Your doctor or a registered dietitian can tell you what fits your own case.

Read how we build and check every page in our [editorial policy](/editorial-policy/). Questions or suggestions? Write to {{ site.contact_email }}.
