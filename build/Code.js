"use strict";
var CodeBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/gas/gas.entry.ts
  var gas_entry_exports = {};
  __export(gas_entry_exports, {
    regenerateUsergroups: () => regenerateUsergroups,
    runSyncUsergroups: () => runSyncUsergroups,
    runTestSyncUsergroups: () => runTestSyncUsergroups
  });

  // Spreadsheet configuration: master spreadsheet and default sheet name.
  // src/shared/sheetConfig.ts
  var SPREADSHEET_ID = "1s99mjgy4xHETpZMds2Lo-RkdBh3MAQOG5OvwkIhBcG0";
  var DEFAULT_SHEET_NAME = "People Directory";

    // src/sheets/groupsSheet.ts
  /**
   * Normalizes a header value (trim + lowercase) for comparison.
   */
  function normalizeHeader(h) {
    return String(h || "").trim().toLowerCase();
  }

  /**
   * Reads a sheet and returns an array of row objects with normalized keys:
   * GroupName, Handle, Description, Members.
   */
  function getGroupRowsFromSheet(spreadsheetId, sheetName) {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(sheetName) || ss.getSheets()[0];
    if (!sheet)
      throw new Error("Sheet not found");
    const values = sheet.getDataRange().getValues();
    if (!values || values.length < 2)
      return [];
    const headerRow = values[0].map((h) => String(h || "").trim());
    const keys = headerRow.map((h) => {
      const n = normalizeHeader(h);
      if (["group", "groupname", "name"].includes(n))
        return "GroupName";
      if (n === "handle")
        return "Handle";
      if (n === "description")
        return "Description";
      if (n === "members")
        return "Members";
      return h || "";
    });
    const rows = values.slice(1);
    return rows.map((row) => {
      var _a;
      const o = {};
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i] || headerRow[i] || `col${i}`;
        o[k] = (_a = row[i]) != null ? _a : "";
      }
      return o;
    });
  }

    // src/slack/api.ts
  /**
   * Reads the Slack bot token from Script Properties.
   * Throws if missing.
   */
  function getSlackToken() {
    const token = PropertiesService.getScriptProperties().getProperty("SLACK_TOKEN");
    if (!token)
      throw new Error("Missing SLACK_TOKEN property. Set it in Script Properties.");
    return token;
  }
  // For usergroup + user operations (Mandate sync, runSyncUsergroups, etc.)
  function getSlackUserToken() {
    const token = PropertiesService.getScriptProperties().getProperty("SLACK_USER_TOKEN");
    if (!token) throw new Error("Missing SLACK_USER_TOKEN property.");
    return token;
  }

  // For future Slack logging (chat.postMessage), if needed
  function getSlackBotToken() {
    const token = PropertiesService.getScriptProperties().getProperty("SLACK_BOT_TOKEN");
    if (!token) throw new Error("Missing SLACK_BOT_TOKEN property.");
    return token;
  }

  /**
   * Generic Slack Web API wrapper with basic rate‑limit handling.
   * @param {string} endpoint Slack method path (e.g. "users.list").
   * @param {string} [method="get"] HTTP method.
   * @param {Object} [payload] POST payload.
   * @param {number} [retry=0] Current retry count for rate limiting.
   */
  function slackApi(endpoint, method = "get", payload, retry = 0) {
    const url = `https://slack.com/api/${endpoint}`;
    const token = getSlackUserToken();
    
    const options = {
      method,
      muteHttpExceptions: true,
      headers: { Authorization: `Bearer ${token}` }
    };

    if (method === "post" && payload) options.payload = payload;

    const res = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(res.getContentText());

    // Handle rate limit with exponential backoff.
    if (json.error === "ratelimited") {
      const wait = Math.min(1000 * Math.pow(2, retry), 30000);
      Utilities.sleep(wait);
      return slackApi(endpoint, method, payload, retry + 1);
    }

    return json;
  }


  // src/slack/usergroups.ts
    /**
   * Returns all Slack usergroups (without user lists).
   */
  function listUsergroups() {
    const res = slackApi("usergroups.list?include_users=false");
    return res.usergroups || [];
  }

  /**
   * Creates a new Slack usergroup with the given name/handle/description.
   */
  function createUsergroup(name, handle, description) {
    const payload = { name };
    if (handle)
      payload.handle = handle;
    if (description)
      payload.description = description;
    return slackApi("usergroups.create", "post", payload);
  }

  /**
   * Updates metadata for an existing Slack usergroup (name, handle, description).
   */
  function updateUsergroup(id, fields) {
    const payload = { usergroup: id, ...fields };
    return slackApi("usergroups.update", "post", payload);
  }

  /**
   * Returns the list of user IDs currently in a Slack usergroup.
   */
  function getUsergroupUsers(id) {
    const res = slackApi(`usergroups.users.list?usergroup=${encodeURIComponent(id)}`);
    return res.ok ? res.users || [] : [];
  }

  /**
   * Replaces all members of a Slack usergroup with the provided list of user IDs.
   */
  function setUsergroupUsers(id, userIds) {
    const payload = { usergroup: id, users: userIds.join(",") };
    return slackApi("usergroups.users.update", "post", payload);
  }

  // src/slack/users.ts
  /**
   * Resolves a Slack user identifier.
   * - If the value already looks like a Slack user ID, returns it.
   * - Otherwise treats the value as an email and calls users.lookupByEmail.
   */
  function lookupSlackUserId(value) {
    if (!value) return null;

    // If it's already a Slack user ID, return it directly
    if (value.startsWith("U") && value.length >= 8) {
      return value;
    }

    // Otherwise treat it as an email
    const res = slackApi(
      `users.lookupByEmail?email=${encodeURIComponent(value)}`
    );
    if (!res.ok) return null;

    return res.user?.id || null;
  }


  // src/sync/syncUsergroups.ts
  /**
  * Safely lowercases and trims a string for use as a map key.
  */
  function toLowerSafe(s) {
    return String(s || "").trim().toLowerCase();
  }

 // src/sync/syncUsergroups.ts
  /**
   * Main Sheet → Slack sync.
   * For each row in the "Slack Usersgroup" sheet:
   * - Finds the corresponding Slack usergroup by name/handle.
   * - Optionally updates group metadata (name/handle/description).
   * - Converts Members emails to user IDs and, if different from Slack,
   *   replaces the usergroup's membership.
   * Returns a report object with updated rows, missing emails, etc.
   */
  function syncUsergroups(spreadsheetId, sheetName) {
    const rows = getGroupRowsFromSheet(spreadsheetId, sheetName);
    const existing = listUsergroups();

    const handleMap = {};
    const nameMap = {};
    existing.forEach((g) => {
      if (g.handle) handleMap[toLowerSafe(g.handle)] = g;
      if (g.name) nameMap[toLowerSafe(g.name)] = g;
    });

    const report = {
      updated: [],
      members_updated: [],
      missing_emails: [],
      skipped_not_found: [],
      errors: []
    };

    rows.forEach((row, i) => {
      const rowNum = i + 2;

      try {
        const name = String(row.GroupName || "").trim();
        const handle = String(row.Handle || "").trim();
        const description = String(row.Description || "").trim();
        const emails = String(row.Members || "")
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);

        if (!name) return;

        const keyHandle = handle ? toLowerSafe(handle) : "";
        const keyName = toLowerSafe(name);

        let group = (keyHandle && handleMap[keyHandle]) || nameMap[keyName] || null;

        if (!group) {
          report.skipped_not_found.push({
            row: rowNum,
            groupName: name,
            message: "Group not found in Slack. Skipping (no creation allowed)."
          });
          return;
        }

        const fields = {};
        if (group.name !== name) fields.name = name;
        if (handle && group.handle !== handle) fields.handle = handle;
        if (description && group.description !== description)
          fields.description = description;

        if (Object.keys(fields).length > 0) {
          const updated = updateUsergroup(group.id, fields);
          if (!updated.ok) report.errors.push({ row: rowNum, error: updated });
          else report.updated.push({ row: rowNum });
        }
        const missing = [];
        const userIds = emails
          .map((em) => {
            const uid = lookupSlackUserId(em);
            if (!uid) missing.push(em);
            return uid;
          })
          .filter(Boolean);

        if (missing.length)
          report.missing_emails.push({ row: rowNum, missing });

        const current = getUsergroupUsers(group.id) || [];
        const currentSet = new Set(current);

        const membershipChanged =
          userIds.length !== current.length ||
          userIds.some((u) => !currentSet.has(u));

        if (membershipChanged) {
          const res = setUsergroupUsers(group.id, userIds);
          if (!res.ok) report.errors.push({ row: rowNum, error: res });
          else
            report.members_updated.push({
              row: rowNum,
              new_count: userIds.length
            });
        }
    } catch (err) {
      report.errors.push({ row: rowNum, error: String(err) });
    }
    });

    Logger.log(JSON.stringify(report, null, 2));
    return report;
  }

  // src/sync/regenerateUsergroups.ts
  /**
   * Rebuilds the "Slack Usersgroup" sheet from live Slack data.
   * For each Slack usergroup, writes its name, handle, description, and current members.
   */
  function regenerateSheetFromSlack(spreadsheetId = SPREADSHEET_ID, sheetName = "Slack Usersgroup") {
    const groups = listUsergroups();
    const rows = [];
    groups.forEach((g) => {
      Utilities.sleep(1000);
      const users = getUsergroupUsers(g.id) || [];
      rows.push([g.name || "", g.handle || "", g.description || "", users.join(",")]);
    });
    const ss = SpreadsheetApp.openById(spreadsheetId);
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet)
      sheet = ss.insertSheet(sheetName);
    sheet.clearContents();
    const headers = ["GroupName", "Handle", "Description", "Members"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (rows.length)
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    return { ok: true, written: rows.length };
  }
  
   /**
   * Builds a People Directory sheet from Slack users.list:
   * MemberID, Email, Name, Team (placeholder), Status, LastActivity.
   */
   function syncPeopleDirectory() {
    const SPREADSHEET_ID = "1s99mjgy4xHETpZMds2Lo-RkdBh3MAQOG5OvwkIhBcG0";
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName("People Directory");

    if (!sheet) {
      sheet = ss.insertSheet("People Directory");
    }

    // Fetch all users from Slack
    const usersRes = slackApi("users.list");
    if (!usersRes.ok) throw new Error("Failed to fetch users from Slack");

    const users = usersRes.members || [];

    // Clear sheet and write headers
    const columns = ["MemberID", "Email", "Name", "Team", "Status", "LastActivity"];
    sheet.clearContents();
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);

    const rows = [];

    users.forEach(u => {
      if (!u.profile || !u.profile.email) return;

      const profile = u.profile;
      const fields = profile.fields || {};
      const team = profile.team || "";;

      const lastActivity = u.updated ? new Date(u.updated * 1000) : "";

      rows.push([
        u.id,
        profile.email,
        profile.real_name,
        team,                          // Team from Slack custom profile field
        u.deleted ? "inactive" : "active",
        lastActivity
      ]);
    });

    if (rows.length) {
      sheet.getRange(2, 1, rows.length, columns.length).setValues(rows);
    }

    Logger.log(`People Directory updated with ${rows.length} users.`);
    return { ok: true, users: rows.length };
  }


  /**
   * GAS entry point: syncs Slack usergroups from the "Slack Usersgroup" sheet.
   */
  // src/gas/gas.entry.ts
  function runSyncUsergroups() {
    return syncUsergroups(SPREADSHEET_ID, "Slack Usersgroup");
  }

  /** 
   * GAS entry point: regenerates the "Slack Usersgroup" sheet from Slack.
   */
  function regenerateUsergroups() {
    return regenerateSheetFromSlack(SPREADSHEET_ID, "Slack Usersgroup");
  }

  globalThis.runSyncUsergroups = runSyncUsergroups;
  globalThis.regenerateUsergroups = regenerateUsergroups;
  globalThis.syncPeopleDirectory = syncPeopleDirectory;
  globalThis.syncAllTeamsToSlack = syncAllTeamsToSlack;
  globalThis.makeDeactivatedUsersSheet = makeDeactivatedUsersSheet;
  globalThis.testSyncNotionJson = testSyncNotionJson;
  globalThis.runSlackPeopleDirectoryWithTeams = runSlackPeopleDirectoryWithTeams;
  globalThis.myFunctionTestMandate = myFunctionTestMandate;

  // === NOTION-DRIVEN SYNC + PEOPLE DIRECTORY ===

  /**
   * Parse Notion JSON pages to simplified person structure
   * @param {Object[]} notionPages
   * @returns {Array<{name:string, team:string, email:string}>}
   */
  function parseNotionPages(notionPages) {
    return (notionPages || []).map(page => {
      const props = page.properties || {};

      const name = props.Name?.title?.[0]?.plain_text || "";
      const email = props["Email (Org)"]?.email || "";

      // (L) Team (Current) rollup -> first multi_select name (if present)
      const roll = props["(L) Team (Current)"]?.rollup?.array || [];
      const multi = roll[0]?.multi_select || [];
      const teamName = multi[0]?.name || "";

      return { name, team: teamName, email };
    });
  }

  /**
   * Writes an audit sheet called "Notion-Slack Audit" with all
   * detected mismatches between Notion and Slack:
   * - "missing_email": Notion email that could not be resolved
   *   to a Slack user ID.
   * - "missing_group": Notion group that does not exist as a
   *   Slack usergroup.
   *
   * @param {Object} report - Result object returned by syncFromNotionJson.
   */
  function writeNotionSlackAudit(report) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName("Notion-Slack Audit");
    if (!sheet) sheet = ss.insertSheet("Notion-Slack Audit");

    sheet.clearContents();

    const headers = [
      "Type",        // "missing_email" or "missing_group"
      "GroupName",
      "Detail"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    const rows = [];

    // Missing emails: one row per missing email
    (report.missing_emails || []).forEach(entry => {
      
      const groupName = entry.groupName || "";
      (entry.missing || []).forEach(email => {
        rows.push([
          "missing_email",
          groupName,
          email
        ]);
      });
    });

    // Missing groups: one row per group not found in Slack
    (report.skipped_not_found || []).forEach(entry => {
      rows.push([
        "missing_group",
        entry.groupName || "",
        entry.reason || ""
      ]);
    });

    if (rows.length) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }

    Logger.log(`Notion-Slack Audit written with ${rows.length} rows.`);
  }

  /**
   * Groups people by team to build desired Slack usergroup models.
   * Each distinct team becomes one group with a handle and list
   * of member emails.
   *
   * @param {Array<{name:string, team:string, email:string}>} people
   * @returns {Array<{name:string, handle:string, emails:string[]}>}
   *          Team-level group definitions derived from Notion.
   */
  function buildGroupsFromPeople(people) {
    const teamMap = {}; // teamName -> Set of emails

    (people || []).forEach(p => {
      if (!p.team || !p.email) return;
      const key = String(p.team).trim();
      if (!key) return;

      if (!teamMap[key]) teamMap[key] = new Set();
      teamMap[key].add(p.email);
    });

    return Object.keys(teamMap).map(teamName => ({
      name: teamName,
      handle: teamName
        ? teamName.toLowerCase().replace(/\s+/g, "-")
        : "",
      emails: Array.from(teamMap[teamName])
    }));
  }

  /**
   * Compares Notion-derived groups with Slack usergroups.
   * - Notion JSON is treated as the source of truth for which teams
   *   exist and which emails belong to them.
   * - Existing Slack groups are matched by handle or name.
   * - No new groups are created in this version; missing groups are
   *   logged in the report.
   * - For existing groups, membership is compared and, if changed,
   *   usergroups.users.update is called (unless dryRun is true).
   *
   * @param {Object[]} notionPages - Notion page results (notionJson.results).
   * @param {boolean} [dryRun=true] - If true, logs intended changes only.
   * @returns {Object} report - Summary of created/updated groups,
   *           missing emails, missing groups, and errors.
   */
  function syncFromNotionJson(notionPages, dryRun = true) {
    const people = parseNotionPages(notionPages);
    const rows = buildGroupsFromPeople(people); // { name, handle, emails[] }

    const existingGroups = listUsergroups();

    const handleMap = {};
    const nameMap = {};
    (existingGroups || []).forEach(g => {
      if (g.handle) {
        const h = String(g.handle).toLowerCase();
        handleMap[h] = g;
      }
      if (g.name) {
        const n = String(g.name).toLowerCase();
        nameMap[n] = g;
      }
    });

    const report = {
      created: [],             // stays empty (no creation)
      updated: [],
      members_updated: [],
      missing_emails: [],
      skipped_not_found: [],
      errors: []
    };

    (rows || []).forEach((row, i) => {
      const rowNum = i + 2;
      try {
        const name = String(row.name || "").trim();
        const handle = String(row.handle || "").trim();
        const emails = Array.isArray(row.emails) ? row.emails : [];

        if (!name) return;

        const keyHandle = handle ? handle.toLowerCase() : "";
        const keyName = name.toLowerCase();

        const group =
          (keyHandle && handleMap[keyHandle]) ||
          nameMap[keyName] ||
          null;

        // If group does not exist in Slack, just log and skip (no creation)
        if (!group) {
          report.skipped_not_found.push({
            row: rowNum,
            groupName: name,
            reason: "Group not found in Slack. Skipping (creation disabled)."
          });
          return;
        }

        // Map emails -> Slack user IDs
        const missing = [];
        const userIds = emails
          .map(email => {
            const uid = lookupSlackUserId(email);
            if (!uid) missing.push(email);
            return uid;
          })
          .filter(Boolean);

        if (missing.length) {
          report.missing_emails.push({
            row: rowNum,
            groupName: name,
            missing
          });
        }

        const currentMembers = getUsergroupUsers(group.id) || [];
        const currentSet = new Set(currentMembers);
        const membershipChanged =
          userIds.length !== currentMembers.length ||
          userIds.some(u => !currentSet.has(u));

        if (membershipChanged) {
          if (dryRun) {
            Logger.log(
              `[Dry Run] Would update members for group ${name}: ${userIds.join(",")}`
            );
            report.members_updated.push({
              row: rowNum,
              groupName: name,
              new_count: userIds.length,
              dryRun: true
            });
          } else {
            const res = setUsergroupUsers(group.id, userIds);
            if (res.ok) {
              report.members_updated.push({
                row: rowNum,
                groupName: name,
                new_count: userIds.length,
                dryRun: false
              });
            } else {
              report.errors.push({
                row: rowNum,
                groupName: name,
                error: res
              });
            }
          }
        }
      } catch (e) {
        report.errors.push({
          row: rowNum,
          error: String(e)
        });
      }
    });

    Logger.log("Sync report: " + JSON.stringify(report, null, 2));
    return report;
  }


  /**
   * Write People Directory sheet from Notion pages
   * Columns: MemberID, Email, Name, Team, Status, LastActivity
   * Uses only Notion as source for Team; MemberID/Status/LastActivity are left blank.
   * @param {Object[]} notionPages
   */
  function writePeopleDirectoryFromNotion(notionPages) {
    const people = parseNotionPages(notionPages); // { name, team, email }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName("People directory from notion");
    if (!sheet) sheet = ss.insertSheet("People directory from notion");

    const headers = ["MemberID", "Email", "Name", "Team", "Status", "LastActivity"];
    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    const rows = people
      .filter(p => p.email) // only rows with an email
      .map(p => [
        "",                  // MemberID (Slack ID can be filled via merge if needed)
        p.email,
        p.name,
        p.team,
        "active",            // Status (assumed; can be merged with Slack later)
        ""                   // LastActivity
      ]);

    if (rows.length) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }

    Logger.log(`People Directory written with ${rows.length} rows.`);
  }

  /**
   * Build merged People Directory from Slack + Notion
   * Slack: MemberID, Status, LastActivity
   * Notion: Team (and fallback Name)
   */
  function buildMergedPeopleDirectory() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 1) Slack: build email -> { id, name, status, lastActivity }
    const usersRes = slackApi("users.list");
    if (!usersRes.ok) throw new Error("Failed to fetch users from Slack");
    const users = usersRes.members || [];

    const slackByEmail = {};
    users.forEach(u => {
      if (!u.profile || !u.profile.email) return;
      const email = String(u.profile.email).toLowerCase();
      const lastActivity = u.updated ? new Date(u.updated * 1000) : "";
      slackByEmail[email] = {
        memberId: u.id,
        name: u.profile.real_name,
        status: u.deleted ? "inactive" : "active",
        lastActivity
      };
    });

    // 2) Notion: build email -> team
    const fileContent = HtmlService.createHtmlOutputFromFile('exampleJSON').getContent();
    const notionJson = JSON.parse(fileContent);
    const peopleFromNotion = parseNotionPages(notionJson.results); // { name, team, email }

    const mergedRows = [];

    peopleFromNotion.forEach(p => {
      if (!p.email) return;
      const emailKey = String(p.email).toLowerCase();
      const slack = slackByEmail[emailKey] || {
        memberId: "",
        name: p.name,
        status: "",
        lastActivity: ""
      };

      mergedRows.push([
        slack.memberId,          // MemberID (from Slack)
        p.email,                 // Email (Notion)
        slack.name || p.name,    // Name (prefer Slack, fallback Notion)
        p.team,                  // Team (Notion)
        slack.status,            // Status (Slack)
        slack.lastActivity       // LastActivity (Slack)
      ]);
    });

    // 3) Write to a single People Directory sheet
    let sheet = ss.getSheetByName("People Directory from notion") || ss.insertSheet("People Directory from notion");
    const headers = ["MemberID", "Email", "Name", "Team", "Status", "LastActivity"];
    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    if (mergedRows.length) {
      sheet.getRange(2, 1, mergedRows.length, headers.length).setValues(mergedRows);
    }

    Logger.log(`Merged People Directory written with ${mergedRows.length} rows.`);
  }

  /**
   * High-level demo / review entry point:
   * 1. Reads exampleJSON (Notion export) from the Apps Script project.
   * 2. Writes the Notion-only directory sheet.
   * 3. Runs a dry-run Notion→Slack sync to compute diffs.
   * 4. Builds the merged People Directory (Slack + Notion).
   * 5. Writes the Notion-Slack Audit sheet with missing users/groups.
   */
  function testSyncNotionJson() {
    const fileContent = HtmlService.createHtmlOutputFromFile('exampleJSON').getContent();
    const notionJson = JSON.parse(fileContent);

    // 1) Build People Directory from Notion
    writePeopleDirectoryFromNotion(notionJson.results);

    // 2) Sync Slack groups from Notion (no creation, just compare + log)
    const report = syncFromNotionJson(notionJson.results, true); // keep dryRun = true or false as you prefer
    Logger.log(report);

    // 3) Build merged People Directory (Slack + Notion)
    buildMergedPeopleDirectory();

    // 4) Write audit sheet with missing users / groups
    writeNotionSlackAudit(report);
  }


  /**
   * Build a map from email -> team from Notion pages
   * @param {Object[]} notionPages
   * @returns {Object<string,string>} emailToTeam
   */
  function buildEmailToTeamMap(notionPages) {
    const people = parseNotionPages(notionPages); // { name, team, email }
    const map = {};
    (people || []).forEach(p => {
      if (p.email && p.team) {
        map[p.email.toLowerCase()] = p.team;
      }
    });
    return map;
  }
  /**
   * Fill Team column in the Slack-based People Directory using Notion JSON
   * Assumes syncPeopleDirectory() has already created/updated the sheet.
   * @param {Object[]} notionPages
   */
  function fillTeamsInSlackPeopleDirectory(notionPages) {
    const emailToTeam = buildEmailToTeamMap(notionPages);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("People Directory");
    if (!sheet) {
      Logger.log("People Directory sheet not found.");
      return;
    }

    const values = sheet.getDataRange().getValues();
    if (!values || values.length < 2) return;

    const header = values[0];
    const emailCol = header.indexOf("Email");
    const teamCol = header.indexOf("Team");
    if (emailCol === -1 || teamCol === -1) {
      Logger.log("Email or Team column not found in People Directory.");
      return;
    }

    const updates = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const email = String(row[emailCol] || "").toLowerCase();
      const team = emailToTeam[email] || "";
      updates.push([team]);
    }

    if (updates.length) {
      // Write back only the Team column (starting at row 2)
      sheet.getRange(2, teamCol + 1, updates.length, 1).setValues(updates);
    }

    Logger.log(`Filled Team column for ${updates.length} rows in People Directory.`);
  }

  /**
   * Convenience entry point that:
   * 1. Refreshes People Directory from Slack (IDs, status, activity).
   * 2. Loads Notion JSON.
   * 3. Fills or corrects the Team column based on Notion teams.
   * This makes Slack the source for user metadata and Notion the source
   * for team assignments in one call.
   */
  function runSlackPeopleDirectoryWithTeams() {
    // 1) Refresh People Directory from Slack
    syncPeopleDirectory();

    // 2) Load Notion JSON (same file you use elsewhere)
    const fileContent = HtmlService.createHtmlOutputFromFile('exampleJSON').getContent();
    const notionJson = JSON.parse(fileContent);

    // 3) Overwrite Team column using Notion
    fillTeamsInSlackPeopleDirectory(notionJson.results);
  }

  /**
 * Reads users from the Mandate Test sheet and builds:
 * Map<teamName, string[]> of member emails.
 * Skips users with non-active statuses.
 */
function readUsersFromMandateTest() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Mandate Test");
  if (!sheet) {
    Logger.log("Mandate Test sheet not found.");
    return new Map();
  }

  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return new Map();

  const header = values[0].map(h => String(h || "").trim());
  const emailCol   = header.indexOf("Email (Org)");
  const statusCol  = header.indexOf("Mandate (Status)");
  const teamCol    = header.indexOf("Team (Current)");

  if (emailCol === -1 || statusCol === -1 || teamCol === -1) {
    Logger.log("Mandate Test sheet missing required columns.");
    return new Map();
  }

  const inactiveStatuses = new Set(["to verify", "completed", "archived"]);

  const teamMap = new Map(); // teamName -> string[] emails

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const email = String(row[emailCol] || "").trim();
    const status = String(row[statusCol] || "").trim().toLowerCase();
    const teamCell = String(row[teamCol] || "").trim();

    if (!email || !teamCell) continue;
    if (inactiveStatuses.has(status)) continue; // skip non-active

    // Split comma-separated teams
    const teamNames = teamCell
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    teamNames.forEach(teamName => {
      if (!teamName) return;
      // Optional: skip admin groups
      if (teamName.toLowerCase().includes("admin")) return;

      const key = teamName;
      if (!teamMap.has(key)) teamMap.set(key, []);
      teamMap.get(key).push(email);
    });
  }

  Logger.log(`Mandate Test read: ${teamMap.size} teams.`);
  return teamMap;
}


/**
 * Test: read Mandate Test sheet and log team -> emails map.
 * Later this becomes the parent entry point for Slack sync.
 */
function myFunctionTestMandate() {
  const teamMap = readUsersFromMandateTest();

  teamMap.forEach((emails, teamName) => {
    Logger.log(`Team ${teamName}: ${emails.join(", ")}`);
  });
}


/**
 * Reads users from the real Mandate / People sheet and builds:
 * Map<teamName, string[]> of member emails, skipping inactive statuses.
 */
function readUsersFromMandateSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Mandate");  // CHANGE to real tab name
  if (!sheet) {
    Logger.log("Mandate sheet not found.");
    return new Map();
  }

  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return new Map();

  const header = values[0].map(h => String(h || "").trim());
  const emailCol  = header.indexOf("Email (Org)");
  const statusCol = header.indexOf("Mandate (Status)");
  const teamCol   = header.indexOf("Team (Current)");

  if (emailCol === -1 || statusCol === -1 || teamCol === -1) {
    Logger.log("Mandate sheet missing required columns.");
    return new Map();
  }

  const inactiveStatuses = new Set(["to verify", "completed", "archived"]);

  const teamMap = new Map();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const email = String(row[emailCol] || "").trim();
    const status = String(row[statusCol] || "").trim().toLowerCase();
    const teamCell = String(row[teamCol] || "").trim();

    if (!email || !teamCell) continue;
    if (inactiveStatuses.has(status)) continue;

    const teamNames = teamCell
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    teamNames.forEach(teamName => {
      if (!teamName) return;
      if (teamName.toLowerCase().includes("admin")) return; // skip admin teams

      if (!teamMap.has(teamName)) teamMap.set(teamName, []);
      teamMap.get(teamName).push(email);
    });
  }

  Logger.log(`Mandate read: ${teamMap.size} teams.`);
  return teamMap;
}
/**
 * Main Mandate-driven sync (dry-run by default).
 * Builds team -> email map from Mandate sheet and compares with Slack.
 * For now, only logs what would change.
 */
function myFunctionMandate(dryRun = true) {
  const teamMap = readUsersFromMandateSheet();
  const usergroups = listUsergroups();

  const nameMap = {};
  usergroups.forEach(g => {
    if (g.name) nameMap[g.name.toLowerCase()] = g;
  });

  const report = {
    teams: [],
    errors: []
  };

  teamMap.forEach((emails, teamName) => {
    try {
      const group = nameMap[teamName.toLowerCase()];
      if (!group) {
        report.teams.push({
          teamName,
          action: "missing_group",
          note: "Not found in Slack (no creation in this phase)"
        });
        return;
      }

      const missing = [];
      const userIds = emails
        .map(em => {
          const uid = lookupSlackUserId(em);
          if (!uid) missing.push(em);
          return uid;
        })
        .filter(Boolean);

      const current = getUsergroupUsers(group.id) || [];
      const currentSet = new Set(current);
      const membershipChanged =
        userIds.length !== current.length ||
        userIds.some(u => !currentSet.has(u));

      if (!membershipChanged) {
        report.teams.push({
          teamName,
          action: "no_change",
          members: userIds.length
        });
        return;
      }

      if (dryRun) {
        report.teams.push({
          teamName,
          action: "would_update_members",
          new_count: userIds.length,
          missing
        });
      } else {
        const res = setUsergroupUsers(group.id, userIds);
        if (!res.ok) {
          report.errors.push({ teamName, error: res });
        } else {
          report.teams.push({
            teamName,
            action: "updated_members",
            new_count: userIds.length,
            missing
          });
        }
      }
    } catch (e) {
      report.errors.push({ teamName, error: String(e) });
    }
  });

  Logger.log(JSON.stringify(report, null, 2));
  return report;
}

/**
 * Builds a "Deactivated Users" sheet from Slack users.list.
 * Lists only users marked deleted/inactive.
 */
function makeDeactivatedUsersSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Deactivated Users");
  if (!sheet) sheet = ss.insertSheet("Deactivated Users");

  const usersRes = slackApi("users.list");
  if (!usersRes.ok) throw new Error("Failed to fetch users from Slack");

  const users = usersRes.members || [];

  const headers = ["MemberID", "Email", "Name", "Deleted", "LastActivity"];
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  const rows = [];

  users.forEach(u => {
    if (!u.deleted) return; // only deactivated
    const profile = u.profile || {};
    const email = profile.email || "";
    const name = profile.real_name || u.name || "";
    const lastActivity = u.updated ? new Date(u.updated * 1000) : "";
    rows.push([
      u.id,
      email,
      name,
      true,
      lastActivity
    ]);
  });

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  Logger.log(`Deactivated Users sheet updated with ${rows.length} users.`);
  return { ok: true, users: rows.length };
}


/**
 * Get presence info for a single Slack user ID.
 * Returns { presence, online, auto_away, manual_away, last_activity }.
 */
function getUserPresence(userId) {
  const res = slackApi(`users.getPresence?user=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    Logger.log("users.getPresence failed for " + userId + ": " + JSON.stringify(res));
    return null;
  }
  // presence: "active" or "away"
  // online / auto_away / manual_away / last_activity may be present for authed user
  return {
    presence: res.presence || "",
    online: !!res.online,
    auto_away: !!res.auto_away,
    manual_away: !!res.manual_away,
    last_activity: res.last_activity || null
  };
}
/**
 * After syncPeopleDirectory has run, fill a Presence column
 * for up to maxRows users using users.getPresence.
 */
function fillPresenceInPeopleDirectory(maxRows = 700) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("People Directory");
  if (!sheet) {
    Logger.log("People Directory sheet not found.");
    return;
  }

  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return;

  const header = values[0];
  let presenceCol = header.indexOf("Presence");
  if (presenceCol === -1) {
    // add a Presence column at the end
    presenceCol = header.length;
    sheet.getRange(1, presenceCol + 1).setValue("Presence");
  }

  const memberIdCol = header.indexOf("MemberID");
  if (memberIdCol === -1) {
    Logger.log("MemberID column not found in People Directory.");
    return;
  }

  const updates = [];
  const rowCount = Math.min(maxRows, values.length - 1);

  for (let i = 1; i <= rowCount; i++) {
    const row = values[i];
    const userId = String(row[memberIdCol] || "").trim();
    if (!userId) {
      updates.push([""]);
      continue;
    }

    const presenceInfo = getUserPresence(userId);
    const presence = presenceInfo ? presenceInfo.presence : "";
    updates.push([presence]);
  }

  if (updates.length) {
    sheet.getRange(2, presenceCol + 1, updates.length, 1).setValues(updates);
  }

  Logger.log(`Filled Presence column for ${updates.length} rows in People Directory.`);
}



  globalThis.fillPresenceInPeopleDirectory = fillPresenceInPeopleDirectory;
  globalThis.myFunctionMandate = myFunctionMandate;
  return __toCommonJS(gas_entry_exports);
}
)();

function fillPresenceInPeopleDirectory() { return CodeBundle.fillPresenceInPeopleDirectory();}
/**
 * GAS wrapper that calls the bundled runSyncUsergroups implementation.
 * Used as the public entry point from the Apps Script editor / triggers.
 */
function runSyncUsergroups() { return CodeBundle.runSyncUsergroups(); }

/**
 * GAS wrapper that regenerates the "Slack Usersgroup" sheet
 * from live Slack usergroup data.
 */
function regenerateUsergroups() { return CodeBundle.regenerateUsergroups(); }

/**
 * GAS wrapper that refreshes the People Directory sheet from Slack.
 */
function syncPeopleDirectory() { return CodeBundle.syncPeopleDirectory(); }

/**
 * GAS wrapper for syncing all teams into Slack usergroups
 * (legacy helper, uses People Directory + Slack Usersgroup sheets).
 */
function syncAllTeamsToSlack() {return CodeBundle.syncAllTeamsToSlack();}

/**
 * GAS wrapper that builds a sheet of deactivated Slack users
 * (implementation lives inside the bundled CodeBundle).
 */
function makeDeactivatedUsersSheet() {return CodeBundle.makeDeactivatedUsersSheet();}

/**
 * GAS wrapper that runs the Notion-driven sync + audit flow:
 * - builds Notion-only directory
 * - compares Notion vs Slack
 * - writes merged directory and audit sheet.
 */
function testSyncNotionJson() { return CodeBundle.testSyncNotionJson(); }

/**
 * GAS wrapper that:
 * - refreshes People Directory from Slack, then
 * - fills Team column using Notion data.
 */
function runSlackPeopleDirectoryWithTeams() { return CodeBundle.runSlackPeopleDirectoryWithTeams();}

function myFunctionTestMandate() { return CodeBundle.myFunctionTestMandate();}
function myFunctionMandate() { return CodeBundle.myFunctionMandate();}

/**
 * Simple web endpoint that shows a small HTML dashboard
 * listing the main GAS functions available to admins.
 */
function doGet() {
  const html = `
    <h2>Slack Usergroup Sync - Prototype Dashboard</h2>
    <p>This Apps Script prototype demonstrates:</p>

    <ul>
      <li>📄 Syncing Google Sheets → Slack Usergroups</li>
      <li>🔄 Regenerating Usergroups Sheet from Slack</li>
      <li>👥 Mapping emails to Slack user IDs</li>
      <li>🗂 Handling group description, handle, members</li>
    </ul>

    <h3>Available Functions</h3>
    <table border="1" cellpadding="6" style="border-collapse: collapse;">
      <tr>
        <th>Function</th>
        <th>Description</th>
      </tr>
      <tr>
        <td><code>runTestSyncUsergroups()</code></td>
        <td>Runs a test sync between Sheet → Slack and prints report</td>
      </tr>
      <tr>
        <td><code>runSyncUsergroups()</code></td>
        <td>Full sync of all Slack usergroups</td>
      </tr>
      <tr>
        <td><code>regenerateUsergroups()</code></td>
        <td>Creates a new sheet populated with Slack usergroups</td>
      </tr>
    </table>

    <h3>Project Files (Compiled)</h3>
    <ul>
      <li><strong>gas.entry.ts</strong> → Exposes main GAS functions</li>
      <li><strong>sheetConfig.ts</strong> → Stores Spreadsheet ID</li>
      <li><strong>groupsSheet.ts</strong> → Reads rows + parses sheet</li>
      <li><strong>users.ts</strong> → Slack email → user ID lookup</li>
      <li><strong>usergroups.ts</strong> → CRUD for Slack usergroups</li>
      <li><strong>syncUsergroups.ts</strong> → Main sync logic</li>
      <li><strong>regenerateUsergroups.ts</strong> → Build sheet from Slack</li>
      <li><strong>api.ts</strong> → Handles Slack API calls</li>
    </ul>

    <p style="margin-top:20px;">Prototype Status: <strong>Ready for review ✔️</strong></p>
  `;
  
  return HtmlService.createHtmlOutput(html);
}

/**
 * Opens the custom HTML sidebar ("AdminPanel") for Slack admin
 * controls inside the Google Sheets UI.
 */
function showAdminPanel() {
  const html = HtmlService.createHtmlOutputFromFile('AdminPanel')
    .setTitle('Slack Admin Control Panel')
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * onOpen trigger: adds the "Slack Admin" custom menu
 * to the Google Sheets UI so admins can open the control panel.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Slack Admin')
    .addItem('Open Control Panel', 'showAdminPanel')
    .addToUi();
}
///////////////////////////////////////////////////////////////////////////////////////////


// /* ----------SLACK BOT WITH GEMINI AI------------------------------- */

// function doPost(e) {
//   try {
//     const json = JSON.parse(e.postData.contents);

//     if (json.type === "url_verification") {
//       return ContentService.createTextOutput(json.challenge);
//     }

//     if (json.type === "event_callback") {
//       const event = json.event;

//       // Ignore bot messages
//       if (event.bot_id) return ContentService.createTextOutput("ok");

//       // Only respond in DIRECT MESSAGES
//       if (event.type === "message" && event.channel_type === "im") {
//         const userText = event.text;
//         const channel = event.channel;

//         const reply = generateReply(userText);
//         sendReply(channel, reply);
//       }
//     }

//     return ContentService.createTextOutput("ok");
//   } catch (err) {
//     return ContentService.createTextOutput("Error: " + err);
//   }
// }

// function askGemini(prompt) {
//   const apiKey =
//     PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

//   const url =
//     "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" +
//     apiKey;

//   const payload = {
//     contents: [{ parts: [{ text: prompt }] }]
//   };

//   const options = {
//     method: "post",
//     contentType: "application/json",
//     payload: JSON.stringify(payload),
//     muteHttpExceptions: true
//   };

//   const res = UrlFetchApp.fetch(url, options);
//   const data = JSON.parse(res.getContentText());

//   try {
//     return data.candidates[0].content.parts[0].text;
//   } catch (e) {
//     return " AI could not generate a response.";
//   }
// }

// function generateReply(userText) {
//   return askGemini(userText);
// }

// function sendReply(channel, text) {
//   const token =
//     PropertiesService.getScriptProperties().getProperty("SLACK_TOKEN");

//   UrlFetchApp.fetch("https://slack.com/api/chat.postMessage", {
//     method: "post",
//     contentType: "application/json",
//     headers: { Authorization: "Bearer " + token },
//     payload: JSON.stringify({
//       channel: channel,
//       text: text
//     })
//   });
// }

// function testGemini() {
//   const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_KEY");

//   const url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + apiKey;

//   const payload = {
//     contents: [
//       { parts: [{ text: "Say hello from Gemini!" }] }
//     ]
//   };

//   const options = {
//     method: "post",
//     contentType: "application/json",
//     payload: JSON.stringify(payload),
//     muteHttpExceptions: true
//   };

//   const res = UrlFetchApp.fetch(url, options);
//   const json = JSON.parse(res.getContentText());

//   Logger.log("RAW RESPONSE:");
//   Logger.log(JSON.stringify(json, null, 2));

//   try {
//     const reply = json.candidates[0].content.parts[0].text;
//     Logger.log("Gemini Reply: " + reply);
//   } catch (e) {
//     Logger.log("Gemini Reply: Failed to parse");
//   }
// }



