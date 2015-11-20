console.log("we good..")

$(document).ready(function (){
    $('a[href=#top]').click(function(){
        $('html, body').animate({scrollTop:0}, 3000);
        $("html, body").animate({ scrollTop: $('html, body').prop("scrollHeight")}, 6000);
    });



    $('.desc-0').hover(function(e){
      // description div shows on mouse %, may want later
      // var newtop = e.clientY / 8;
      // $('.description').css({top: newtop+'%'});
      $('#desc-0').show();
    }, function(){
      $('#desc-0').hide();
    });

    $('.desc-1').hover(function(e){
      $('#desc-1').show();
    }, function(){
      $('#desc-1').hide();
    });

    $('.desc-2').hover(function(e){
      $('#desc-2').show();
    }, function(){
      $('#desc-2').hide();
    });

    $('.desc-3').hover(function(e){
      $('#desc-3').show();
    }, function(){
      $('#desc-3').hide();
    });


});
