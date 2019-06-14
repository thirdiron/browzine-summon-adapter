browzine.primo = (function() {
  var libraryId = browzine.libraryId;
  var api = libraryIdOverride(urlRewrite(browzine.api));
  var apiKey = browzine.apiKey;

  function urlRewrite(url) {
    if(!url) {
      return;
    }

    return url.indexOf("public-api.thirdiron.com") > -1 ? url : url.replace("api.thirdiron.com", "public-api.thirdiron.com");
  };

  function libraryIdOverride(url) {
    var override = url;
    var libraryId = browzine.libraryId;

    if(libraryId) {
      var baseUrl = "https://public-api.thirdiron.com/public/v1/libraries/{libraryId}";
      override = baseUrl.replace(/{libraryId}/g, libraryId);
    }

    return override;
  };

  function getResult(scope) {
    return scope.result || scope.item;
  };

  function isArticle(scope) {
    var validation = false;
    var result = getResult(scope);

    if(result && result.pnx) {
      if(result.pnx.display && result.pnx.display.type) {
        var contentType = result.pnx.display.type[0].trim().toLowerCase();

        if(contentType === "article") {
          validation = true;
        }
      }
    }

    return validation;
  };

  function isJournal(scope) {
    var validation = false;
    var result = getResult(scope);

    if(result && result.pnx) {
      if(result.pnx.display && result.pnx.display.type) {
        var contentType = result.pnx.display.type[0].trim().toLowerCase();

        if(contentType === "journal") {
          validation = true;
        }
      }
    }

    return validation;
  };

  function getIssn(scope) {
    var issn = "";
    var result = getResult(scope);

    if(result && result.pnx && result.pnx.addata) {
      if(result.pnx.addata.issn) {
        if(result.pnx.addata.issn.length > 1) {
          issn = result.pnx.addata.issn.join(",").trim().replace(/-/g, "");
        } else {
          if(result.pnx.addata.issn[0]) {
            issn = result.pnx.addata.issn[0].trim().replace("-", "");
          }
        }
      }

      if(result.pnx.addata.eissn && !issn) {
        if(result.pnx.addata.eissn.length > 1) {
          issn = result.pnx.addata.eissn.join(",").trim().replace(/-/g, "");
        } else {
          if(result.pnx.addata.eissn[0]) {
            issn = result.pnx.addata.eissn[0].trim().replace("-", "");
          }
        }
      }
    }

    return encodeURIComponent(issn);
  };

  function getDoi(scope) {
    var doi = "";
    var result = getResult(scope);

    if(result && result.pnx) {
      if(result.pnx.addata && result.pnx.addata.doi) {
        if(result.pnx.addata.doi[0]) {
          doi = result.pnx.addata.doi[0].trim();
        }
      }
    }

    return encodeURIComponent(doi);
  };

  function getEndpoint(scope) {
    var endpoint = "";

    if(isArticle(scope)) {
      var doi = getDoi(scope);
      endpoint = api + "/articles/doi/" + doi + "?include=journal";
    }

    if(isJournal(scope)) {
      var issn = getIssn(scope);
      endpoint = api + "/search?issns=" + issn;
    }

    endpoint += "&access_token=" + apiKey;

    return endpoint;
  };

  function getData(response) {
    var data = {};

    if(Array.isArray(response.data)) {
      data = response.data.filter(function(journal) {
        return journal.browzineEnabled === true;
      }).pop();
    } else {
      data = response.data;
    }

    return data;
  };

  function getIncludedJournal(response) {
    var journal = null;

    if(response.included) {
      journal = Array.isArray(response.included) ? response.included[0] : response.included;
    }

    return journal;
  };

  function getBrowZineWebLink(data) {
    var browzineWebLink = null;

    if(data && data.browzineWebLink) {
      browzineWebLink = data.browzineWebLink;
    }

    return browzineWebLink;
  };

  function getCoverImageUrl(scope, data, journal) {
    var coverImageUrl = null;

    if(isJournal(scope)) {
      if(data && data.coverImageUrl) {
        coverImageUrl = data.coverImageUrl;
      }
    }

    if(isArticle(scope)) {
      if(journal && journal.coverImageUrl) {
        coverImageUrl = journal.coverImageUrl;
      }
    }

    return coverImageUrl;
  };

  function getBrowZineEnabled(scope, data, journal) {
    var browzineEnabled = false;

    if(isJournal(scope)) {
      if(data && data.browzineEnabled) {
        browzineEnabled = data.browzineEnabled;
      }
    }

    if(isArticle(scope)) {
      if(journal && journal.browzineEnabled) {
        browzineEnabled = journal.browzineEnabled;
      }
    }

    return browzineEnabled;
  };

  function isDefaultCoverImage(coverImageUrl) {
    var defaultCoverImage = false;

    if(coverImageUrl && coverImageUrl.toLowerCase().indexOf("default") > -1) {
      defaultCoverImage = true;
    }

    return defaultCoverImage;
  };

  function getDirectToPDFUrl(scope, data) {
    var directToPDFUrl = null;

    if(isArticle(scope)) {
      if(data.fullTextFile) {
        directToPDFUrl = data.fullTextFile;
      }
    }

    return directToPDFUrl;
  };

  function showJournalCoverImages() {
    var featureEnabled = false;
    var config = browzine.journalCoverImagesEnabled;

    if(typeof config === "undefined" || config === null || config === true) {
      featureEnabled = true;
    }

    return featureEnabled;
  };

  function showJournalBrowZineWebLinkText() {
    var featureEnabled = false;
    var config = browzine.journalBrowZineWebLinkTextEnabled;

    if(typeof config === "undefined" || config === null || config === true) {
      featureEnabled = true;
    }

    return featureEnabled;
  };

  function showArticleBrowZineWebLinkText() {
    var featureEnabled = false;
    var config = browzine.articleBrowZineWebLinkTextEnabled;

    if(typeof config === "undefined" || config === null || config === true) {
      featureEnabled = true;
    }

    return featureEnabled;
  };

  function showDirectToPDFLink() {
    var featureEnabled = false;
    var config = browzine.articlePDFDownloadLinkEnabled;
    var prefixConfig = browzine.primoArticlePDFDownloadLinkEnabled;

    if(typeof config === "undefined" || config === null || config === true) {
      featureEnabled = true;
    }

    if(typeof prefixConfig !== "undefined" && prefixConfig !== null && prefixConfig === false) {
      featureEnabled = false;
    }

    return featureEnabled;
  };

  function showPrintRecords() {
    var featureEnabled = false;
    var config = browzine.printRecordsIntegrationEnabled;

    if(typeof config === "undefined" || config === null || config === true) {
      featureEnabled = true;
    }

    return featureEnabled;
  };

  function isFiltered(scope) {
    var validation = false;
    var result = getResult(scope);

    if(result && result.delivery) {
      if(result.delivery.deliveryCategory) {
        var deliveryCategory = result.delivery.deliveryCategory[0].trim().toLowerCase();

        if(deliveryCategory === "alma-p" && !showPrintRecords()) {
          validation = true;
        }
      }
    }

    return validation;
  };

  function directToPDFTemplate(directToPDFUrl) {
    var pdfIcon = "https://assets.thirdiron.com/images/integrations/browzine-pdf-download-icon.svg";
    var articlePDFDownloadLinkText = browzine.articlePDFDownloadLinkText || browzine.primoArticlePDFDownloadLinkText  || "Download Now";

    var template = "<div class='browzine' style='line-height: 1.4em; margin-right: 4.5em;'>" +
                      "<a class='browzine-direct-to-pdf-link' href='{directToPDFUrl}' target='_blank' rel='noopener'>" +
                          "<img src='{pdfIcon}' class='browzine-pdf-icon' style='margin-bottom: -3px; margin-right: 2.8px;' aria-hidden='true' width='12' height='16'/> " +
                          "<span class='browzine-web-link-text'>{articlePDFDownloadLinkText}</span> " +
                          "<md-icon md-svg-icon='primo-ui:open-in-new' class='md-primoExplore-theme' aria-hidden='true' style='height: 15px; width: 15px; min-height: 15px; min-width: 15px; margin-top: -2px;'><svg width='100%' height='100%' viewBox='0 0 24 24' y='504' xmlns='http://www.w3.org/2000/svg' fit='' preserveAspectRatio='xMidYMid meet' focusable='false'><path d='M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z'></path></svg></md-icon>" +
                      "</a>" +
                   "</div>";

    template = template.replace(/{directToPDFUrl}/g, directToPDFUrl);
    template = template.replace(/{articlePDFDownloadLinkText}/g, articlePDFDownloadLinkText);
    template = template.replace(/{pdfIcon}/g, pdfIcon);

    return template;
  };

  function browzineWebLinkTemplate(scope, browzineWebLink) {
    var browzineWebLinkText = "";
    var bookIcon = "https://assets.thirdiron.com/images/integrations/browzine-open-book-icon.svg";

    if(isJournal(scope)) {
      browzineWebLinkText = browzine.journalBrowZineWebLinkText || browzine.primoJournalBrowZineWebLinkText || "View Journal Contents";
    }

    if(isArticle(scope)) {
      browzineWebLinkText = browzine.articleBrowZineWebLinkText || browzine.primoArticleBrowZineWebLinkText || "View Issue Contents";
    }

    var template = "<div class='browzine' style='line-height: 1.4em;'>" +
                      "<a class='browzine-web-link' href='{browzineWebLink}' target='_blank' rel='noopener'>" +
                          "<img src='{bookIcon}' class='browzine-book-icon' style='margin-bottom: -2px; margin-right: 2.5px;' aria-hidden='true' width='15' height='15'/> " +
                          "<span class='browzine-web-link-text'>{browzineWebLinkText}</span> " +
                          "<md-icon md-svg-icon='primo-ui:open-in-new' class='md-primoExplore-theme' aria-hidden='true' style='height: 15px; width: 15px; min-height: 15px; min-width: 15px; margin-top: -2px;'><svg width='100%' height='100%' viewBox='0 0 24 24' y='504' xmlns='http://www.w3.org/2000/svg' fit='' preserveAspectRatio='xMidYMid meet' focusable='false'><path d='M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z'></path></svg></md-icon>" +
                      "</a>" +
                   "</div>";

    template = template.replace(/{browzineWebLink}/g, browzineWebLink);
    template = template.replace(/{browzineWebLinkText}/g, browzineWebLinkText);
    template = template.replace(/{bookIcon}/g, bookIcon);

    return template;
  };

  function getElement(scope) {
    return scope.$element;
  };

  function getElementParent(element) {
    return element[0].offsetParent || element[0];
  };

  function getScope($scope) {
    return $scope && $scope.$ctrl && $scope.$ctrl.parentCtrl ? $scope.$ctrl.parentCtrl : undefined;
  };

  function shouldEnhance(scope) {
    var validation = false;

    if(!isFiltered(scope)) {
      if(isJournal(scope) && getIssn(scope)) {
        validation = true;
      }

      if(isArticle(scope) && getDoi(scope)) {
        validation = true;
      }
    }

    return validation;
  };

  function searchResult($scope) {
    var scope = getScope($scope);

    if(!shouldEnhance(scope)) {
      return;
    }

    var endpoint = getEndpoint(scope);

    var request = new XMLHttpRequest();
    request.open("GET", endpoint, true);
    request.setRequestHeader("Content-type", "application/json");

    request.onload = function() {
      if(request.readyState == XMLHttpRequest.DONE && request.status == 200) {
        var response = JSON.parse(request.response);

        var data = getData(response);
        var journal = getIncludedJournal(response);

        var browzineWebLink = getBrowZineWebLink(data);
        var coverImageUrl = getCoverImageUrl(scope, data, journal);
        var browzineEnabled = getBrowZineEnabled(scope, data, journal);
        var defaultCoverImage = isDefaultCoverImage(coverImageUrl);
        var directToPDFUrl = getDirectToPDFUrl(scope, data);

        var element = getElement(scope);

        if(directToPDFUrl && isArticle(scope) && showDirectToPDFLink() && browzineEnabled) {
          var template = directToPDFTemplate(directToPDFUrl);

          (function poll() {
            var elementParent = getElementParent(element);
            var availabilityLine = elementParent.querySelector("prm-search-result-availability-line .layout-align-start-start");

            if(availabilityLine) {
              availabilityLine.insertAdjacentHTML('afterbegin', template);
            } else {
              requestAnimationFrame(poll);
            }
          })();
        }

        if(browzineWebLink && browzineEnabled && isJournal(scope) && showJournalBrowZineWebLinkText()) {
          var template = browzineWebLinkTemplate(scope, browzineWebLink);
          element.append(template);
        }

        if(browzineWebLink && browzineEnabled && isArticle(scope) && showArticleBrowZineWebLinkText()) {
          var template = browzineWebLinkTemplate(scope, browzineWebLink);
          element.append(template);
        }

        if(coverImageUrl && !defaultCoverImage && showJournalCoverImages()) {
          (function poll() {
            var elementParent = getElementParent(element);
            var coverImages = elementParent.querySelectorAll("prm-search-result-thumbnail-container img");

            if(coverImages[0]) {
              if(coverImages[0].className.indexOf("fan-img") > -1) {
                Array.prototype.forEach.call(coverImages, function(coverImage) {
                  coverImage.src = coverImageUrl;
                });
              } else {
                requestAnimationFrame(poll);
              }
            }
          })();
        }
      }
    };

    request.send();
  };

  return {
    searchResult: searchResult,
    urlRewrite: urlRewrite,
    libraryIdOverride: libraryIdOverride,
    getResult: getResult,
    isArticle: isArticle,
    isJournal: isJournal,
    getIssn: getIssn,
    getDoi: getDoi,
    isFiltered: isFiltered,
    getEndpoint: getEndpoint,
    shouldEnhance: shouldEnhance,
    getData: getData,
    getIncludedJournal: getIncludedJournal,
    getBrowZineWebLink: getBrowZineWebLink,
    getCoverImageUrl: getCoverImageUrl,
    getBrowZineEnabled: getBrowZineEnabled,
    isDefaultCoverImage: isDefaultCoverImage,
    getDirectToPDFUrl: getDirectToPDFUrl,
    showJournalCoverImages: showJournalCoverImages,
    showJournalBrowZineWebLinkText: showJournalBrowZineWebLinkText,
    showArticleBrowZineWebLinkText: showArticleBrowZineWebLinkText,
    showDirectToPDFLink: showDirectToPDFLink,
    showPrintRecords: showPrintRecords,
    directToPDFTemplate: directToPDFTemplate,
    browzineWebLinkTemplate: browzineWebLinkTemplate,
    getElement: getElement,
    getElementParent: getElementParent,
    getScope: getScope,
  };
}());
