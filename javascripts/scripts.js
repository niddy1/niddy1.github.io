console.log("we good..")

$(document).ready(function (){
    $('a[href=#top]').click(function(){
        $('html, body').animate({scrollTop:0}, 3000);
        $("html, body").animate({ scrollTop: $('html, body').prop("scrollHeight")}, 6000);
    });

    $('#modal-close').on("click", function(){
      $('#mobile-modal').toggle();
    });


    $('.desc-0').hover(function(e){
      // description div shows on mouse %, may want later
      // var newtop = e.clientY / 8;
      // $('.description').css({top: newtop+'%'});
      $('#desc-0').stop().animate({
            right: "18px"
        }, 300);
    }, function(){
      $('#desc-0').stop().animate({
            right: "-1500px"
        }, 300);
    });

    $('.desc-1').hover(function(e){
      $('#desc-1').stop().animate({
            right: "18px"
        }, 300);
    }, function(){
      $('#desc-1').stop().animate({
            right: "-1500px"
        }, 300);
    });

    $('.desc-2').hover(function(e){
      $('#desc-2').stop().animate({
            right: "18px"
        }, 300);
    }, function(){
      $('#desc-2').stop().animate({
            right: "-1500px"
        }, 300);
    });

    $('.desc-3').hover(function(e){
      $('#desc-3').stop().animate({
            right: "18px"
        }, 300);
    }, function(){
      $('#desc-3').stop().animate({
            right: "-1500px"
        }, 300);
    });

    //////

    $('.desc-golfweek').hover(function(e){
      $('#desc-golfweek').stop().animate({
            right: "18px"
        }, 300);
    }, function(){
      $('#desc-golfweek').stop().animate({
            right: "-1500px"
        }, 300);
    });

    $('.desc-nfl').hover(function(e){
      $('#desc-nfl').stop().animate({
            right: "18px"
        }, 300);
    }, function(){
      $('#desc-nfl').stop().animate({
            right: "-1500px"
        }, 300);
    });

    $('.desc-dancebody').hover(function(e){
      $('#desc-dancebody').stop().animate({
            right: "18px"
        }, 300);
    }, function(){
      $('#desc-dancebody').stop().animate({
            right: "-1500px"
        }, 300);
    });

    $('.desc-brightcore').hover(function(e){
      $('#desc-brightcore').stop().animate({
            right: "18px"
        }, 300);
    }, function(){
      $('#desc-brightcore').stop().animate({
            right: "-1500px"
        }, 300);
    });

    $('.desc-sallie').hover(function(e){
      $('#desc-sallie').stop().animate({
            right: "18px"
        }, 300);
    }, function(){
      $('#desc-sallie').stop().animate({
            right: "-1500px"
        }, 300);
    });

    $('.desc-castellanos').hover(function(e){
      $('#desc-castellanos').stop().animate({
            right: "18px"
        }, 300);
    }, function(){
      $('#desc-castellanos').stop().animate({
            right: "-1500px"
        }, 300);
    });

    $('.desc-cws').hover(function(e){
      $('#desc-cws').stop().animate({
            right: "18px"
        }, 300);
    }, function(){
      $('#desc-cws').stop().animate({
            right: "-1500px"
        }, 300);
    });

    $('.desc-wsta').hover(function(e){
      $('#desc-wsta').stop().animate({
            right: "18px"
        }, 300);
    }, function(){
      $('#desc-wsta').stop().animate({
            right: "-1500px"
        }, 300);
    });
});
