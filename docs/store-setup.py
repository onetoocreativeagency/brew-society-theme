"""Brew Society store setup. Additive only: creates definitions, pages and menus, and
updates the seven existing brand collections. Never deletes. Run with --apply to write."""
import json, subprocess, sys
APPLY = "--apply" in sys.argv
URL = "https://brew-society.myshopify.com/admin/api/2026-07/graphql.json"
LOG = []
def gql(q, v=None):
    body = json.dumps({"query": q, "variables": v or {}})
    out = subprocess.run(["curl", "-sS", "--http1.1", "-m", "90", "-X", "POST", URL, "-H", "Content-Type: application/json", "--data-binary", body], capture_output=True, text=True).stdout
    d = json.loads(out)
    if d.get("errors"): raise SystemExit("API ERROR " + json.dumps(d["errors"])[:800])
    return d["data"]
def write(label, q, v, key):
    if not APPLY: print("  DRY  " + label); return None
    r = gql(q, v)[key]; errs = r.get("userErrors") or []
    LOG.append({"action": label, "userErrors": errs, "result": {k: x for k, x in r.items() if k != "userErrors"}})
    print(("  FAIL " if errs else "  OK   ") + label + (" " + json.dumps(errs) if errs else "")); return r

CATEGORIES = ["Alt. Milks", "Confectionery", "Drink", "Snack", "Tea", "Coffee", "Bakery", "Syrup", "Water", "Packaging"]
RELATIONSHIPS = ["Owner", "Importer", "Distributor"]
choices = lambda xs: [{"name": "choices", "value": json.dumps(xs)}]
DEFS = [  # ownerType, namespace, key, name, type, description, validations
 ("COLLECTION", "brand", "category", "Brand category", "single_line_text_field", "The product category this brand is listed under on the Brands page.", choices(CATEGORIES)),
 ("COLLECTION", "brand", "origin", "Brand origin", "single_line_text_field", "Country the brand comes from, for example Australia or Germany.", None),
 ("COLLECTION", "brand", "relationship", "Brand relationship", "list.single_line_text_field", "How Brew Society works with this brand.", choices(RELATIONSHIPS)),
 ("COLLECTION", "brand", "exclusive", "Exclusive to Brew Society", "boolean", "Shows the Exclusive sticker on the brand.", None),
 ("COLLECTION", "brand", "new", "New brand", "boolean", "Shows the New label on the brand card.", None),
 ("COLLECTION", "brand", "logo", "Brand logo", "file_reference", "Logo shown in the logo view of the Brands page.", [{"name": "file_type_options", "value": json.dumps(["Image"])}]),
 ("COLLECTION", "brand", "range_size", "Products in range", "number_integer", "Number of products in the wholesale range. Leave blank to show the number of shop products.", None),
 ("COLLECTION", "brand", "website", "Brand website", "url", "The brand's own website.", None),
 ("COLLECTION", "brand", "instagram", "Brand Instagram", "single_line_text_field", "Instagram handle, for example @specialfriends.", None),
 ("COLLECTION", "brand", "info_pack", "Brand info pack", "file_reference", "Downloadable information pack (PDF) for wholesale buyers.", None),
 ("COLLECTION", "brand", "pepper_url", "Brand ordering link", "url", "Link to this brand in the Pepper ordering portal. Leave blank to use the main portal link.", None),
 ("PRODUCT", "custom", "wholesale_only", "Wholesale only", "boolean", "Shows the Wholesale Only label and hides price and Add to Cart. Pricing is in the ordering portal.", None),
 ("PRODUCT", "custom", "badge", "Card label", "single_line_text_field", "Short label on the product card, for example New.", None),
]
PAGES = [("About", "about", None), ("Contact", "contact", "contact"), ("Wholesale", "wholesale", None)]
BRANDS = {  # existing collection handle -> (category, origin, relationship, exclusive)   source: Figma brand list + current site's exclusive strip
 "coffee-1": ("Coffee", "Australia", ["Distributor"], None),
 "home-beverages": ("Tea", "Australia", ["Distributor"], True),
 "nibana-drinking-chocolate": ("Confectionery", "Australia", ["Distributor"], True),
 "prana-chai": ("Tea", "Australia", ["Distributor"], True),
 "simply-roasted": ("Snack", "UK", ["Importer"], True),
 "sodas": ("Drink", "Australia", ["Distributor"], True),
 "vivani-organic-chocolate": ("Confectionery", "Germany", ["Importer"], True),
}

print("APPLYING" if APPLY else "DRY RUN (nothing is written)")
print("\n1. Metafield definitions")
have = set()
for owner in ("COLLECTION", "PRODUCT"):
    for e in gql("query($o:MetafieldOwnerType!){ metafieldDefinitions(first:100, ownerType:$o){ edges{ node{ namespace key } } } }", {"o": owner})["metafieldDefinitions"]["edges"]:
        have.add((owner, e["node"]["namespace"], e["node"]["key"]))
for owner, ns, key, name, typ, desc, val in DEFS:
    if (owner, ns, key) in have: print(f"  SKIP exists {owner} {ns}.{key}"); continue
    d = {"ownerType": owner, "namespace": ns, "key": key, "name": name, "type": typ, "description": desc, "pin": True}
    if val: d["validations"] = val
    write(f"define {owner.lower()} {ns}.{key} ({typ})", "mutation($d:MetafieldDefinitionInput!){ metafieldDefinitionCreate(definition:$d){ createdDefinition{ id namespace key } userErrors{ field message code } } }", {"d": d}, "metafieldDefinitionCreate")

print("\n2. Pages (created hidden)")
pages = {e["node"]["handle"]: e["node"]["id"] for e in gql("{ pages(first:100){ edges{ node{ id handle } } } }")["pages"]["edges"]}
for title, handle, suffix in PAGES:
    if handle in pages: print(f"  SKIP exists /pages/{handle}"); continue
    p = {"title": title, "handle": handle, "isPublished": False, "body": ""}
    if suffix: p["templateSuffix"] = suffix
    r = write(f"create hidden page /pages/{handle}", "mutation($p:PageCreateInput!){ pageCreate(page:$p){ page{ id handle isPublished } userErrors{ field message code } } }", {"p": p}, "pageCreate")
    if r and r.get("page"): pages[handle] = r["page"]["id"]

print("\n3. Menus")
menus = gql("{ menus(first:50){ edges{ node{ id handle items{ title type resourceId url } } } } }")["menus"]["edges"]
handles = {e["node"]["handle"] for e in menus}
policy = {i["title"]: i for e in menus if e["node"]["handle"] == "footer" for i in e["node"]["items"] if i["type"] == "SHOP_POLICY"}
def page_item(title, handle):
    return {"title": title, "type": "PAGE", "resourceId": pages[handle]} if handle in pages else {"title": title, "type": "HTTP", "url": f"https://shop.brewsociety.com.au/pages/{handle}"}
main = [{"title": "Brands", "type": "COLLECTIONS"}, {"title": "Shop", "type": "CATALOG"}, page_item("About", "about"), page_item("FAQ", "faqs"), page_item("Contact", "contact")]
legal = [{"title": t, "type": "SHOP_POLICY", "resourceId": policy[src]["resourceId"]} for t, src in (("Legal", "Terms of Service"), ("Shipping", "Shipping & Returns"), ("Refunds", "Refund policy")) if src in policy]
for title, handle, items in (("Brew Society main", "brew-society-main", main), ("Brew Society legal", "brew-society-legal", legal)):
    if handle in handles: print(f"  SKIP exists menu {handle}"); continue
    write(f"create menu {handle}: " + ", ".join(i["title"] + "[" + i["type"] + "]" for i in items), "mutation($t:String!,$h:String!,$i:[MenuItemCreateInput!]!){ menuCreate(title:$t, handle:$h, items:$i){ menu{ id handle } userErrors{ field message code } } }", {"t": title, "h": handle, "i": items}, "menuCreate")

print("\n4. Existing brand collections: brand template + details")
only = [a.split("=")[1] for a in sys.argv if a.startswith("--only=")]
for e in gql("{ collections(first:250){ edges{ node{ id handle title templateSuffix } } } }")["collections"]["edges"]:
    c = e["node"]
    if c["handle"] not in BRANDS or (only and c["handle"] not in only): continue
    cat, origin, rel, excl = BRANDS[c["handle"]]
    mf = [{"namespace": "brand", "key": "category", "type": "single_line_text_field", "value": cat}, {"namespace": "brand", "key": "origin", "type": "single_line_text_field", "value": origin}, {"namespace": "brand", "key": "relationship", "type": "list.single_line_text_field", "value": json.dumps(rel)}]
    if excl is not None: mf.append({"namespace": "brand", "key": "exclusive", "type": "boolean", "value": "true" if excl else "false"})
    write(f"collection {c['handle']} ({c['title']}): template '{c['templateSuffix'] or ''}' -> 'brand'; {cat} / {origin} / {','.join(rel)} / exclusive={excl}", "mutation($i:CollectionInput!){ collectionUpdate(input:$i){ collection{ id handle templateSuffix } userErrors{ field message } } }", {"i": {"id": c["id"], "templateSuffix": "brand", "metafields": mf}}, "collectionUpdate")
if APPLY: json.dump(LOG, open("setup-log.json", "a"), indent=1); print("\nlog appended to setup-log.json")
