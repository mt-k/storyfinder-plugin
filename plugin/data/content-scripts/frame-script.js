addMessageListener("storyfinder@make_screenshot_from_rectangle", makeScreenshot);

function makeScreenshot(payload) {
    var rectangle = payload.data;
    var startX = rectangle.startX || 0;
    var startY = rectangle.startY || 0;
    var width = rectangle.width || content.innerWidth;
    var height = rectangle.height || content.innerHeight;
    // Create canvas to draw window unto
    var canvas = content.document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
    canvas.width = width;
    canvas.height = height;
    // Create context for drawing, draw the old window unto the canvas
    var context = canvas.getContext("2d");
    context.drawWindow(content, startX, startY, width, height, "rgb(255,255,255)");
    // Save context as png
    var image = canvas.toDataURL('image/png');
    sendAsyncMessage("storyfinder@got-screenshot", image);
}