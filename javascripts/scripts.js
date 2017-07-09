console.log("we good..")

$(document).ready(function (){
    $('a[href=#top]').click(function(){
        $('html, body').animate({scrollTop:0}, 3000);
        $("html, body").animate({ scrollTop: $('html, body').prop("scrollHeight")}, 6000);
    });

    $('#modal-close').on("click", function(){
      $('#mobile-modal').toggle();
    });


    $('.desc-0, .desc-1, .desc-2, .desc-3').hover(function(e){
      // description div shows on mouse %, may want later
      // var newtop = e.clientY / 8;
      // $('.description').css({top: newtop+'%'});
      $('#desc-0, #desc-1, #desc-2, #desc-3').stop().animate({
            right: "18px"
        }, 300);
    }, function(){
      $('#desc-0, #desc-1, #desc-2, #desc-3').stop().animate({
            right: "-1500px"
        }, 300);
    });

    // $('.desc-1').hover(function(e){
    //   $('#desc-1').stop().animate({
    //         right: "18px"
    //     }, 300);
    // }, function(){
    //   $('#desc-1').stop().animate({
    //         right: "-1500px"
    //     }, 300);
    // });

    // $('.desc-2').hover(function(e){
    //   $('#desc-2').stop().animate({
    //         right: "18px"
    //     }, 300);
    // }, function(){
    //   $('#desc-2').stop().animate({
    //         right: "-1500px"
    //     }, 300);
    // });

    // $('.desc-3').hover(function(e){
    //   $('#desc-3').stop().animate({
    //         right: "18px"
    //     }, 300);
    // }, function(){
    //   $('#desc-3').stop().animate({
    //         right: "-1500px"
    //     }, 300);
    // });


});
