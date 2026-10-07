<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:html="http://www.w3.org/TR/REC-html40"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title>XML Sitemap | Global Luxury Emporium</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1a1a1a;
            background-color: #faf9f6;
            margin: 0;
            padding: 30px 20px;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          }
          header {
            border-bottom: 2px solid #000000;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }
          h1 {
            font-size: 24px;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            margin: 0 0 6px 0;
            color: #000000;
          }
          .subtitle {
            font-size: 13px;
            color: #666666;
            margin: 0;
          }
          .stats {
            display: inline-block;
            background: #111111;
            color: #d4af37;
            font-weight: 600;
            font-size: 12px;
            padding: 4px 10px;
            border-radius: 4px;
            margin-top: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 13px;
          }
          th {
            background-color: #f5f5f5;
            color: #111111;
            text-align: left;
            padding: 10px 12px;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
            border-bottom: 2px solid #e0e0e0;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #eeeeee;
            vertical-align: middle;
          }
          tr:hover td {
            background-color: #fafafa;
          }
          a {
            color: #000000;
            text-decoration: none;
            font-weight: 500;
          }
          a:hover {
            text-decoration: underline;
            color: #d4af37;
          }
          .badge {
            display: inline-block;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 3px;
            background: #f0f0f0;
            color: #555;
          }
          .badge-high {
            background: #e8f5e9;
            color: #2e7d32;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>Global Luxury Emporium — XML Sitemap</h1>
            <p class="subtitle">Search Engine Index for globalluxuryemporium.com</p>
            <div class="stats">
              Total Indexed URLs: <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/>
            </div>
          </header>

          <table>
            <thead>
              <tr>
                <th width="50%">URL</th>
                <th width="15%">Images</th>
                <th width="15%">Change Frequency</th>
                <th width="10%">Priority</th>
                <th width="10%">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td>
                    <a target="_blank">
                      <xsl:attribute name="href">
                        <xsl:value-of select="sitemap:loc"/>
                      </xsl:attribute>
                      <xsl:value-of select="sitemap:loc"/>
                    </a>
                  </td>
                  <td>
                    <xsl:choose>
                      <xsl:when test="image:image">
                        <span class="badge">
                          <xsl:value-of select="count(image:image)"/> Image(s)
                        </span>
                      </xsl:when>
                      <xsl:otherwise>
                        <span style="color:#aaa;">—</span>
                      </xsl:otherwise>
                    </xsl:choose>
                  </td>
                  <td>
                    <span class="badge">
                      <xsl:value-of select="sitemap:changefreq"/>
                    </span>
                  </td>
                  <td>
                    <xsl:choose>
                      <xsl:when test="sitemap:priority &gt;= 0.8">
                        <span class="badge badge-high">
                          <xsl:value-of select="sitemap:priority"/>
                        </span>
                      </xsl:when>
                      <xsl:otherwise>
                        <span class="badge">
                          <xsl:value-of select="sitemap:priority"/>
                        </span>
                      </xsl:otherwise>
                    </xsl:choose>
                  </td>
                  <td>
                    <span style="color:#666; font-size:12px;">
                      <xsl:value-of select="sitemap:lastmod"/>
                    </span>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
