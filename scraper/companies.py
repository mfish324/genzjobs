"""
Company slug registry for ATS scrapers.
Sourced from the CompanyATS database table (seed-companies.ts).
Each entry is (company_name, slug).
"""

GREENHOUSE_COMPANIES = [
    # Tech Giants & Major Tech
    ("Stripe", "stripe"),
    ("Airbnb", "airbnb"),
    ("Discord", "discord"),
    ("Figma", "figma"),
    ("Notion", "notion"),
    ("Ramp", "ramp"),
    ("Vercel", "vercel"),
    ("Linear", "linear"),
    ("Retool", "retool"),
    ("Scale AI", "scaleai"),
    ("Replit", "replit"),
    ("Webflow", "webflow"),
    ("Flexport", "flexport"),
    ("Brex", "brex"),
    ("Mercury", "mercury"),
    ("Plaid", "plaid"),
    ("Databricks", "databricks"),
    ("HashiCorp", "hashicorp"),
    ("Airtable", "airtable"),
    ("Miro", "miro"),
    ("Segment", "segment"),
    ("Amplitude", "amplitude"),
    ("LaunchDarkly", "launchdarkly"),
    ("PagerDuty", "pagerduty"),
    ("Asana", "asana"),
    ("Gusto", "gusto"),
    ("Lattice", "lattice"),
    ("Gem", "gem"),
    ("Gong", "gong"),
    ("Hightouch", "hightouch"),
    # AI/ML Companies
    ("Anthropic", "anthropic"),
    ("OpenAI", "openai"),
    ("Cohere", "cohere"),
    ("Hugging Face", "huggingface"),
    ("Weights & Biases", "wandb"),
    ("Runway", "runwayml"),
    ("Character.ai", "character"),
    ("Stability AI", "stabilityai"),
    ("Pinecone", "pinecone"),
    ("Anyscale", "anyscale"),
    # Fintech
    ("Chime", "chime"),
    ("Robinhood", "robinhood"),
    ("SoFi", "sofi"),
    ("Affirm", "affirm"),
    ("Coinbase", "coinbase"),
    ("Carta", "carta"),
    ("Marqeta", "marqeta"),
    # E-commerce & Consumer
    ("Shopify", "shopify"),
    ("Instacart", "instacart"),
    ("DoorDash", "doordash"),
    ("Warby Parker", "warbyparker"),
    ("Glossier", "glossier"),
    ("Allbirds", "allbirds"),
    # Health & Biotech
    ("Oscar Health", "oscar"),
    ("Ro", "ro"),
    ("Tempus", "tempus"),
    ("Cerebral", "cerebral"),
    # Enterprise & B2B
    ("MongoDB", "mongodb"),
    ("Snowflake", "snowflake"),
    ("Confluent", "confluent"),
    ("GitLab", "gitlab"),
    ("Datadog", "datadog"),
    ("Snyk", "snyk"),
]

LEVER_COMPANIES = [
    ("Netflix", "netflix"),
    ("Spotify", "spotify"),
    ("Twitch", "twitch"),
    ("Reddit", "reddit"),
    ("Pinterest", "pinterest"),
    ("Lyft", "lyft"),
    ("Uber", "uber"),
    ("Snap", "snap"),
    ("Twitter", "twitter"),
    ("Dropbox", "dropbox"),
    ("Zoom", "zoom"),
    ("Slack", "slack"),
    ("Squarespace", "squarespace"),
    ("Mailchimp", "mailchimp"),
    ("HubSpot", "hubspot"),
    ("Intercom", "intercom"),
    ("Calendly", "calendly"),
    ("Zapier", "zapier"),
    ("Cloudflare", "cloudflare"),
    ("DigitalOcean", "digitalocean"),
    ("Postman", "postman"),
    ("Auth0", "auth0"),
    ("CircleCI", "circleci"),
    ("JetBrains", "jetbrains"),
]

ASHBY_COMPANIES = [
    ("Faire", "faire"),
    ("Grammarly", "grammarly"),
    ("Pave", "pave"),
    ("Descript", "descript"),
    ("Vanta", "vanta"),
    ("Loom", "loom"),
    ("Coda", "coda"),
    ("Snorkel AI", "snorkelai"),
    ("Stytch", "stytch"),
    ("Ironclad", "ironclad"),
    ("Typeface", "typeface"),
    ("Navan", "navan"),
    ("Ashby", "ashby"),
    ("Sardine", "sardine"),
    ("Material Security", "material-security"),
    ("Wundergraph", "wundergraph"),
    ("Fly.io", "fly-io"),
    ("Railway", "railway"),
]

SMARTRECRUITERS_COMPANIES = [
    ("Visa", "visa"),
    ("Equinox", "equinox"),
]

# Slug format: tenant.server.site
# Parsed as: https://{tenant}.{server}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
WORKDAY_COMPANIES = [
    ("Salesforce", "salesforce.wd12.External_Career_Site"),
    ("IBM", "ibm.wd1.IBM_Careers"),
    ("Walmart", "walmart.wd5.WalmartExternal"),
    ("Target", "target.wd5.targetcareers"),
    ("Bank of America", "bankofamerica.wd1.BofAExternal"),
    ("Capital One", "capitalone.wd12.Capital_One"),
    ("JPMorgan Chase", "jpmorganchase.wd5.JPMorganChaseExternal"),
    ("Deloitte", "deloitte.wd1.GlobalCareers"),
    ("Accenture", "accenture.wd3.AccentureCareers"),
    ("EY", "ey.wd5.EY_Careers"),
    ("PwC", "pwc.wd3.PWC_Careers"),
    ("KPMG", "kpmgus.wd5.KPMG_Careers"),
    ("Adobe", "adobe.wd5.external_experienced"),
    ("ServiceNow", "servicenow.wd1.External"),
    ("Workday", "workday.wd5.Workday"),
]

WORKABLE_COMPANIES = [
    ("Rokt", "rokt"),
    ("GroundTruth", "groundtruth"),
    ("NeoWork", "neowork"),
    ("BizForce", "bizforcenow"),
    ("Workable", "workable"),
    ("First Analysis", "first-analysis"),
    ("Rational 360", "rational-360"),
    ("grape", "grape"),
    ("Middlebury College", "middleburycollege"),
    ("Boutique Group", "boutique-group"),
]

RECRUITEE_COMPANIES = [
    ("bunq", "bunq"),
    ("Personio", "personio"),
    ("Applied Value", "appliedvalue"),
    ("Flink", "flink"),
    ("Tellent", "tellent"),
]
