import { serve } from "https://deno.land/std@0.148.0/http/server.ts";
import { parseHTML } from "https://esm.sh/linkedom";
import { convert } from "https://deno.land/x/deno_webp_converter/mod.ts";
import { Destination, download } from "https://deno.land/x/download/mod.ts";
import { Language, minify } from "https://deno.land/x/minifier/mod.ts";

const port = 8080;
const fileServer = "http://localhost:8090/";
//const URL = "https://elvationusa.com"
//const textResponse = await fetch(URL);
//const textData = await textResponse.text();
const project = "websites/elvationusa.com";
const textData = await Deno.readTextFile(project + "/index.html");
const { document } = parseHTML(textData);

const minifyCode = async (lang: string, code: string) => {
  return await minify(Language[lang], code);
};


const addHttps = (url: string) => {
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  return url
}

const appendScriptsToBody = (document) => {
  const scriptTags = document.getElementsByTagName("script");

  // Remove all script tags from head
  scriptTags.forEach((element) => {
    element.remove();
    document.body.appendChild(element);
  });

  return document;
};

const combineInlineStyles = async (document) => {
  const styleTags = document.getElementsByTagName("style");
  let styles = "";

  styleTags.forEach((element) => {
    styles = styles + element.innerText;
    element.remove();
  });

  let newStyle = document.createElement("style");
  newStyle.innerText = await minifyCode("CSS", styles);
  document.head.appendChild(newStyle);

  return document;
};

const getExternalCssInline = async (document) => {
  const links = document.getElementsByTagName("link");
  let styles = "";
  for (const link of links) {
    if (link.type === "text/css") {
      link.href = addHttps(link.href)
      const css = await fetch(link.href);
      const cssContent = await css.text();
      styles = styles + cssContent;
      link.remove();
    }
  }

  if (styles.length > 0) {
    let newStyle = document.createElement("style");
    newStyle.innerText = await minifyCode("CSS", styles);
    document.head.appendChild(newStyle);
    return document;
  }
};

const getExternalScriptsInline = async (document) => {
  const scripts = document.getElementsByTagName("script");

  let inlineScript = "";

  for (const script of scripts) {
    if (script.src.length > 0) {
      script.src = addHttps(script.src)
      const fetchScript = await fetch(script.src);
      const scriptContent = await fetchScript.text();
      inlineScript = inlineScript + scriptContent;
      script.remove();
    }
  }

  if (inlineScript.length > 0) {
    let scriptElement = document.createElement("script");
    scriptElement.type = "text/javascript";
    const inlineTextNode = document.createTextNode(inlineScript);
    scriptElement.appendChild(inlineTextNode);
    document.body.appendChild(scriptElement);
    return document;
  }
};

const convertImageToWebP = async (image) => {
  const filename = image.src.replace(/^.*[\\\/]/, "");
  const destination: Destination = {
    file: filename,
    dir: project + "/assets",
  };

  try {
    const fileObj = await download(image.src, destination);
    await convert(fileObj.fullPath, fileObj.fullPath + ".webp", "-q 80", "-v");
    return fileServer + fileObj.fullPath + ".webp";
  } catch (err) {
    console.log(err)
    return image.src;
  }
};

const convertImagesToWebp = async (document) => {
  const images = document.getElementsByTagName("img");
  for (const image of images) {
    const converted = await convertImageToWebP(image);
    image.src = converted;
    image.srcset = converted;
    image.setAttribute("loading", "lazy");
  }
  return document;
};

let html = await combineInlineStyles(document);
html = await getExternalCssInline(html);
html = await getExternalScriptsInline(html);
html = await convertImagesToWebp(html);
html = appendScriptsToBody(html);

const handler = (request: Request): Response => {
  return new Response(
    html,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    },
  );
};

console.log(`HTTP webserver running. Access it at: http://localhost:8080/`);
await serve(handler, { port });
