$(function() {
  if(typeof browzine === "undefined" || browzine === null) {
    return;
  }

  var api = browzine.api;
  var apiKey = browzine.apiKey;
  var bookIcon = "https://s3.amazonaws.com/thirdiron-assets/images/integrations/browzine_open_book_icon.png";

  function isArticle(data) {
    if(typeof data.document !== "undefined" && data.document !== null) {
      var contentType = data.document.content_type.trim();
      return contentType === "Journal Article";
    } else {
      return data.type === "articles";
    }
  };

  function isJournal(data) {
    if(typeof data.document !== "undefined" && data.document !== null) {
      var contentType = data.document.content_type.trim();
      return contentType === "Journal" || contentType === "eJournal";
    } else {
      return data.type === "journals";
    }
  };

  function getIssn(scope) {
    var issn = "";

    if(typeof scope.document.issns !== "undefined" && scope.document.issns !== null) {
      issn = scope.document.issns[0].trim().replace('-', '');
    }

    if(typeof scope.document.eissns !== "undefined" && scope.document.eissns !== null && issn === "") {
      issn = scope.document.eissns[0].trim().replace('-', '');
    }

    return encodeURIComponent(issn);
  };

  function getDoi(scope) {
    var doi = "";

    if(typeof scope.document.dois !== "undefined" && scope.document.dois !== null) {
      doi = scope.document.dois[0].trim();
    }

    return encodeURIComponent(doi);
  };

  function getEndpoint(scope) {
    var endpoint = "";

    if(isArticle(scope)) {
      var doi = getDoi(scope);
      endpoint = api + "/articles/doi/" + doi + "?include=journal";
    } else if(isJournal(scope)) {
      var issn = getIssn(scope);
      endpoint = api + "/search?issns=" + issn;
    }

    endpoint += "&access_token=" + apiKey;

    return endpoint;
  };

  function shouldEnhance(scope) {
    return (isJournal(scope) && getIssn(scope)) || (isArticle(scope) && getDoi(scope));
  };

  function getData(response) {
    return Array.isArray(response.data) ? response.data[0] : response.data;
  };

  function getIncludedJournal(response) {
    return Array.isArray(response.included) ? response.included[0] : response.included;
  };

  function getBrowZineWebLink(data) {
    var browzineWebLink = null;

    if(typeof data.browzineWebLink !== "undefined" && data.browzineWebLink !== null) {
      browzineWebLink = data.browzineWebLink;
    }

    return browzineWebLink;
  };

  function getCoverImageUrl(data, response) {
    var coverImageUrl = null;

    if(isJournal(data)) {
      if(typeof data.coverImageUrl !== "undefined" && data.coverImageUrl !== null) {
        coverImageUrl = data.coverImageUrl;
      }
    }

    if(isArticle(data)) {
      if(typeof response.included !== "undefined" && response.included !== null) {
        var journal = getIncludedJournal(response);

        if(typeof journal.coverImageUrl !== "undefined" && journal.coverImageUrl !== null) {
          coverImageUrl = journal.coverImageUrl;
        }
      }
    }

    return coverImageUrl;
  };

  function buildTemplate(data, browzineWebLink, bookIcon) {
    var wording = "";
    var browzineWebLinkText = "";

    if(isJournal(data)) {
      wording = browzine.journalWording || "View the Journal";
      browzineWebLinkText = browzine.journalBrowZineWebLinkText || "Browse Now";
    }

    if(isArticle(data)) {
      wording = browzine.articleWording || "View Complete Issue";
      browzineWebLinkText = browzine.articleBrowZineWebLinkText || "Browse Now";
    }

    // You can change the underlined "Browse Now" link name on line 122 below.
    var template = "<div class='browzine'>" +
                     "{{wording}}: <a class='browzine-web-link' href='{{browzineWebLink}}' target='_blank' style='text-decoration: underline; color: #333;'>{{browzineWebLinkText}}</a> " +
                     "<img class='browzine-book-icon' src='{{bookIcon}}'/>" +
                   "</div>";

    template = template.replace(/{{wording}}/g, wording);
    template = template.replace(/{{browzineWebLink}}/g, browzineWebLink);
    template = template.replace(/{{browzineWebLinkText}}/g, browzineWebLinkText);
    template = template.replace(/{{bookIcon}}/g, bookIcon);

    return template;
  };

  function searchResultsWithBrowZine(documentSummary) {
    var scope = angular.element(documentSummary).scope();

    if(!shouldEnhance(scope)) {
      return;
    }

    var endpoint = getEndpoint(scope);

    $.getJSON(endpoint, function(response) {
      var data = getData(response);
      var browzineWebLink = getBrowZineWebLink(data);
      var coverImageUrl = getCoverImageUrl(data, response);

      if(browzineWebLink) {
        var template = buildTemplate(data, browzineWebLink, bookIcon);
        $(documentSummary).find(".docFooter .row:eq(0)").append(template);
      }

      if(coverImageUrl) {
        $(documentSummary).find(".coverImage img").attr("src", coverImageUrl);
      }
    });
  };

  var results = document.querySelector("#results");
  var config = {
    attributes: true,
    childList: true,
    characterData: true,
    subtree: true,
  };

  //Enhance any documentSummary elements present before the observer starts
  var documentSummaries = results.querySelectorAll(".documentSummary");

  Array.prototype.forEach.call(documentSummaries, function(documentSummary) {
    searchResultsWithBrowZine(documentSummary);
  });

  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if(mutation.attributeName === "document-summary") {
        var documentSummary = mutation.target;
        searchResultsWithBrowZine(documentSummary);
      }
    });
  });

  observer.observe(results, config);
});
