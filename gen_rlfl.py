#!/usr/bin/env python3
"""Generates rlfl-data.js: RLFL's 10 teams and their 8-player rosters.

Not needed at runtime — rerun this only if you want a different league
(new team names, new player names, or a different rookie class) and
paste the resulting rlfl-data.js over the existing one.
"""
import random

random.seed(42)

CITIES = [
    "Ember City", "Cascade", "Salt Flat", "Iron Bay", "Copper Ridge", "Frostpine", "Sundown",
    "Harbor Lights", "Dust Bowl", "Blackrock", "Golden Delta", "Northwind", "Redstone",
    "Silverton", "Cypress Point", "Thunder Basin", "Amber Hollow", "Granite Falls",
    "Crimson Plains", "Shadow Pines", "Bayou Ridge", "Highland Crest", "Sable Harbor",
    "Wildfire Mesa", "Stormwatch", "Ironwood", "Driftwood Bay", "Blue Ridge", "Coldwater",
    "Prairie Junction", "Rustbelt", "Emberfall", "Cobalt Coast", "Timber Falls", "Vulture Peak",
    "Marrow Creek", "Starlight Bluff", "Old Forge", "Rimrock", "Fogbank", "Steel Harbor"
]
MASCOTS = [
    "Hawks", "Wolves", "Scorpions", "Sharks", "Bulls", "Elk", "Comets", "Bandits", "Ravens",
    "Gators", "Storm", "Titans", "Vipers", "Bears", "Falcons", "Wolverines", "Rhinos", "Cobras",
    "Bison", "Panthers", "Renegades", "Marauders", "Outlaws", "Grizzlies", "Longhorns",
    "Coyotes", "Stallions", "Mustangs", "Sentinels", "Warhawks", "Ironclads", "Rattlers"
]
random.shuffle(CITIES)
random.shuffle(MASCOTS)
NUM_TEAMS = 10
TEAMS = [CITIES[i] + " " + MASCOTS[i] for i in range(NUM_TEAMS)]

FIRST = [
    "Mace", "Rook", "Deshawn", "Kellen", "Tobias", "Marcus", "Eli", "Jax", "Devon", "Silas",
    "Reid", "Cass", "Nolan", "Trey", "Amir", "Dutch", "Zeke", "Mateo", "Cole", "Bo", "Jaylen",
    "Xavier", "Dominic", "Marquis", "Tyree", "Cade", "Grayson", "Isaiah", "Malik", "Anthony",
    "Brayden", "Colt", "Dallas", "Emmitt", "Gunnar", "Hank", "Jaxon", "Keon", "Lamar", "Maddox",
    "Nash", "Omari", "Preston", "Quincy", "Ronnie", "Sawyer", "Titus", "Ulysses", "Wade",
    "Yusuf", "Zane", "Brock", "Cyrus", "Darnell", "Elton", "Fenwick", "Griffin", "Ignatius",
    "Jared", "Kordell", "Landry", "Merle", "Niko", "Otis", "Percy", "Rashad", "Stone", "Terrence"
]
LAST = [
    "Hendrix", "Okafor", "Vance", "Delgado", "Whitfield", "Marsh", "Calloway", "Bishara",
    "Novak", "Reyes", "Sutton", "Kwan", "Larkin", "Ferro", "Bramwell", "Osei", "Tate", "Vukovic",
    "Marchetti", "Holt", "Donovan", "Ashworth", "Blackwood", "Castellan", "Drummond",
    "Ellsworth", "Faulkner", "Gallow", "Harkness", "Ibarra", "Jorgensen", "Kingsley",
    "Lockhart", "Mercer", "Norwood", "Ostrander", "Pemberton", "Quintana", "Radcliffe",
    "Stanton", "Thackeray", "Underwood", "Valdez", "Winslow", "Yarborough", "Zimmerman",
    "Abernathy", "Brannigan", "Cavanaugh", "Dietrich", "Eastwood", "Fitzgerald", "Gunderson",
    "Halloway", "Ironside", "Jennings", "Kestrel", "Ledbetter", "Monroe", "Nakamura",
    "Prescott", "Quillon", "Rutherford", "Sanborn", "Torrance", "Vasquez", "Wexford"
]
all_names = [f + " " + l for f in FIRST for l in LAST]
random.shuffle(all_names)

# 1 QB, 1 RB, 2 WR, 1 TE, 1 OL, 2 DEF = 8 per team.
POSITIONS = (["QB"] * 1) + (["RB"] * 1) + (["WR"] * 2) + (["TE"] * 1) + (["OL"] * 1) + (["DEF"] * 2)
ROSTER_SIZE = len(POSITIONS)

name_iter = iter(all_names)
roster = {}
for team in TEAMS:
    players = [{"name": next(name_iter), "pos": pos} for pos in POSITIONS]
    # 1 rookie per team, drawn from anywhere in that team's roster.
    for i in random.sample(range(ROSTER_SIZE), 1):
        players[i]["rookie"] = True
    for p in players:
        p.setdefault("rookie", False)
    roster[team] = players

lines = [
    "// Auto-generated RLFL (RipLab Football League) data: %d teams x %d-player rosters." % (NUM_TEAMS, ROSTER_SIZE),
    "// Regenerate with gen_rlfl.py if you ever want a different league.",
    "var RLFL_TEAMS = [",
]
lines += ['  "%s",' % t for t in TEAMS]
lines += ["];", "", "var RLFL_ROSTER = {"]
for t in TEAMS:
    parts = ", ".join(
        '{name:"%s",pos:"%s",rookie:%s}' % (p["name"], p["pos"], "true" if p["rookie"] else "false")
        for p in roster[t]
    )
    lines.append('  "%s": [%s],' % (t, parts))
lines += ["};", ""]

with open("rlfl-data.js", "w") as fp:
    fp.write("\n".join(lines))

print("Wrote rlfl-data.js:", len(TEAMS), "teams,", sum(len(v) for v in roster.values()), "players")
