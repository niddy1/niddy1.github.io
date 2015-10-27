console.log("we good..")


// function scrollWin() {
//     window.scrollBy(200,221);
//     scrolldelay = setTimeout(pageScroll(),1000);
// }

// $('.scroll-top').click
// document.getElementById("top-link").onclick = "pageScroll()"


  $(document).ready(function (){
    $('a[href=#top]').click(function(){
        $('html, body').animate({scrollTop:0}, 3000);
        $("html, body").animate({ scrollTop: $('html, body').prop("scrollHeight")}, 6000);
    });
});
