import { serve } from "https://deno.land/std@0.148.0/http/server.ts";
import { parseHTML } from "https://esm.sh/linkedom";

const port = 8080;
const URL = "https://elvationusa.com"
const textResponse = await fetch(URL);
const textData = await textResponse.text();

const appendScriptsToBody = (HTMLString: string) => {
  const { document } = parseHTML(HTMLString);

  const scriptTags = document.getElementsByTagName("script");
  
  // Remove all script tags from head
  scriptTags.forEach(element => {
    element.remove()
  });

  // Add all script tags before </body> instead
  scriptTags.forEach(element => {
    document.body.appendChild(element)
  });

  return document.toString()
}

const combineStyles = (HTMLString: string) => {
  const { document } = parseHTML(HTMLString);
  const styleTags = document.getElementsByTagName("style");
  styleTags.forEach((element) => {
    console.log(element.innerText)
  })
}



const output = appendScriptsToBody(textData)
combineStyles(textData)

const handler = (request: Request): Response => {
  return new Response(
    output,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    },
  );
};

console.log(`HTTP webserver running. Access it at: http://localhost:8080/`);
await serve(handler, { port });