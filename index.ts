import { serve } from "https://deno.land/std@0.148.0/http/server.ts";
import { parseHTML } from "https://esm.sh/linkedom";
import { convert } from "https://deno.land/x/deno_webp_converter/mod.ts"
import { download, Destination } from "https://deno.land/x/download/mod.ts";

const port = 8080;
const fileServer = "http://localhost:8090/"
//const URL = "https://elvationusa.com"
//const textResponse = await fetch(URL);
//const textData = await textResponse.text();
const project = "websites/elevationusa.com"
const textData = await Deno.readTextFile(project + "/index.html");
const { document } = parseHTML(textData);

const appendScriptsToBody = (document) => {
  const scriptTags = document.getElementsByTagName("script");
  
  // Remove all script tags from head
  scriptTags.forEach(element => {
    element.remove()
    document.body.appendChild(element)
  });

  return document
}

const combineInlineStyles = (document) => {
  const styleTags = document.getElementsByTagName("style");
  let styles = ''

  styleTags.forEach((element) => {
    styles = styles + element.innerText
    element.remove()
  })

  let newStyle = document.createElement('style')
  newStyle.innerText = styles
  document.head.appendChild(newStyle)
  
  return document
}

const convertImageToWebP = async (image) => {
  const filename = image.src.replace(/^.*[\\\/]/, '');
  const destination: Destination = {
    file: filename,
    dir: project + "/assets"
  }

  try {
    const fileObj = await download(image.src, destination);
    await convert(fileObj.fullPath, fileObj.fullPath + ".webp", "-q 80", "-v");
    return fileServer + fileObj.fullPath + ".webp"
  } catch (err) {
    return image.src
  }
} 

const convertImagesToWebp = (document) => {
  const images = document.getElementsByTagName("img");
  images.forEach(async (image) => {
    const converted = await convertImageToWebP(image)
    image.src = converted
    image.srcset = converted
    image.setAttribute("loading", "lazy")
  })
  return document
}

let html = appendScriptsToBody(document)
html = combineInlineStyles(html)
html = convertImagesToWebp(html)

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