import{aR as fe,aS as he,aT as ke,aU as me,aV as We,aW as At,aX as Ve,aI as Bt,aJ as Ht,_ as o,aY as U,d as ut,s as ze,g as Oe,n as Pe,o as Ne,c as Re,b as Be,t as He,m as Ge,l as Dt,j as bt,aZ as Xe,a_ as je,a$ as qe,k as Ue,L as Ze,b0 as ee,b1 as re,b2 as ne,b3 as ie,b4 as ae,b5 as se,b6 as ce,e as Qe,u as $e,b7 as Ke,b8 as Je,b9 as tr,ba as er,bb as rr,bc as nr,bd as ir}from"./index-BNts5tXI.js";const ar=Math.PI/180,sr=180/Math.PI,St=18,ye=.96422,ge=1,pe=.82521,ve=4/29,dt=6/29,be=3*dt*dt,cr=dt*dt*dt;function xe(t){if(t instanceof et)return new et(t.l,t.a,t.b,t.opacity);if(t instanceof nt)return Te(t);t instanceof ke||(t=We(t));var e=Yt(t.r),r=Yt(t.g),n=Yt(t.b),a=It((.2225045*e+.7168786*r+.0606169*n)/ge),h,l;return e===r&&r===n?h=l=a:(h=It((.4360747*e+.3850649*r+.1430804*n)/ye),l=It((.0139322*e+.0971045*r+.7141733*n)/pe)),new et(116*a-16,500*(h-a),200*(a-l),t.opacity)}function or(t,e,r,n){return arguments.length===1?xe(t):new et(t,e,r,n??1)}function et(t,e,r,n){this.l=+t,this.a=+e,this.b=+r,this.opacity=+n}fe(et,or,he(me,{brighter(t){return new et(this.l+St*(t??1),this.a,this.b,this.opacity)},darker(t){return new et(this.l-St*(t??1),this.a,this.b,this.opacity)},rgb(){var t=(this.l+16)/116,e=isNaN(this.a)?t:t+this.a/500,r=isNaN(this.b)?t:t-this.b/200;return e=ye*Ft(e),t=ge*Ft(t),r=pe*Ft(r),new ke(Lt(3.1338561*e-1.6168667*t-.4906146*r),Lt(-.9787684*e+1.9161415*t+.033454*r),Lt(.0719453*e-.2289914*t+1.4052427*r),this.opacity)}}));function It(t){return t>cr?Math.pow(t,1/3):t/be+ve}function Ft(t){return t>dt?t*t*t:be*(t-ve)}function Lt(t){return 255*(t<=.0031308?12.92*t:1.055*Math.pow(t,1/2.4)-.055)}function Yt(t){return(t/=255)<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)}function lr(t){if(t instanceof nt)return new nt(t.h,t.c,t.l,t.opacity);if(t instanceof et||(t=xe(t)),t.a===0&&t.b===0)return new nt(NaN,0<t.l&&t.l<100?0:NaN,t.l,t.opacity);var e=Math.atan2(t.b,t.a)*sr;return new nt(e<0?e+360:e,Math.sqrt(t.a*t.a+t.b*t.b),t.l,t.opacity)}function Vt(t,e,r,n){return arguments.length===1?lr(t):new nt(t,e,r,n??1)}function nt(t,e,r,n){this.h=+t,this.c=+e,this.l=+r,this.opacity=+n}function Te(t){if(isNaN(t.h))return new et(t.l,0,0,t.opacity);var e=t.h*ar;return new et(t.l,Math.cos(e)*t.c,Math.sin(e)*t.c,t.opacity)}fe(nt,Vt,he(me,{brighter(t){return new nt(this.h,this.c,this.l+St*(t??1),this.opacity)},darker(t){return new nt(this.h,this.c,this.l-St*(t??1),this.opacity)},rgb(){return Te(this).rgb()}}));function ur(t){return function(e,r){var n=t((e=Vt(e)).h,(r=Vt(r)).h),a=At(e.c,r.c),h=At(e.l,r.l),l=At(e.opacity,r.opacity);return function(T){return e.h=n(T),e.c=a(T),e.l=h(T),e.opacity=l(T),e+""}}}const dr=ur(Ve);function fr(t){return t}var Tt=1,Wt=2,zt=3,xt=4,oe=1e-6;function hr(t){return"translate("+t+",0)"}function kr(t){return"translate(0,"+t+")"}function mr(t){return e=>+t(e)}function yr(t,e){return e=Math.max(0,t.bandwidth()-e*2)/2,t.round()&&(e=Math.round(e)),r=>+t(r)+e}function gr(){return!this.__axis}function we(t,e){var r=[],n=null,a=null,h=6,l=6,T=3,E=typeof window<"u"&&window.devicePixelRatio>1?0:.5,C=t===Tt||t===xt?-1:1,g=t===xt||t===Wt?"x":"y",I=t===Tt||t===zt?hr:kr;function S(p){var G=n??(e.ticks?e.ticks.apply(e,r):e.domain()),F=a??(e.tickFormat?e.tickFormat.apply(e,r):fr),v=Math.max(h,0)+T,M=e.range(),L=+M[0]+E,Y=+M[M.length-1]+E,R=(e.bandwidth?yr:mr)(e.copy(),E),N=p.selection?p.selection():p,X=N.selectAll(".domain").data([null]),O=N.selectAll(".tick").data(G,e).order(),y=O.exit(),w=O.enter().append("g").attr("class","tick"),b=O.select("line"),x=O.select("text");X=X.merge(X.enter().insert("path",".tick").attr("class","domain").attr("stroke","currentColor")),O=O.merge(w),b=b.merge(w.append("line").attr("stroke","currentColor").attr(g+"2",C*h)),x=x.merge(w.append("text").attr("fill","currentColor").attr(g,C*v).attr("dy",t===Tt?"0em":t===zt?"0.71em":"0.32em")),p!==N&&(X=X.transition(p),O=O.transition(p),b=b.transition(p),x=x.transition(p),y=y.transition(p).attr("opacity",oe).attr("transform",function(m){return isFinite(m=R(m))?I(m+E):this.getAttribute("transform")}),w.attr("opacity",oe).attr("transform",function(m){var _=this.parentNode.__axis;return I((_&&isFinite(_=_(m))?_:R(m))+E)})),y.remove(),X.attr("d",t===xt||t===Wt?l?"M"+C*l+","+L+"H"+E+"V"+Y+"H"+C*l:"M"+E+","+L+"V"+Y:l?"M"+L+","+C*l+"V"+E+"H"+Y+"V"+C*l:"M"+L+","+E+"H"+Y),O.attr("opacity",1).attr("transform",function(m){return I(R(m)+E)}),b.attr(g+"2",C*h),x.attr(g,C*v).text(F),N.filter(gr).attr("fill","none").attr("font-size",10).attr("font-family","sans-serif").attr("text-anchor",t===Wt?"start":t===xt?"end":"middle"),N.each(function(){this.__axis=R})}return S.scale=function(p){return arguments.length?(e=p,S):e},S.ticks=function(){return r=Array.from(arguments),S},S.tickArguments=function(p){return arguments.length?(r=p==null?[]:Array.from(p),S):r.slice()},S.tickValues=function(p){return arguments.length?(n=p==null?null:Array.from(p),S):n&&n.slice()},S.tickFormat=function(p){return arguments.length?(a=p,S):a},S.tickSize=function(p){return arguments.length?(h=l=+p,S):h},S.tickSizeInner=function(p){return arguments.length?(h=+p,S):h},S.tickSizeOuter=function(p){return arguments.length?(l=+p,S):l},S.tickPadding=function(p){return arguments.length?(T=+p,S):T},S.offset=function(p){return arguments.length?(E=+p,S):E},S}function pr(t){return we(Tt,t)}function vr(t){return we(zt,t)}var _e={exports:{}};(function(t,e){(function(r,n){t.exports=n()})(Bt,function(){var r="day";return function(n,a,h){var l=function(C){return C.add(4-C.isoWeekday(),r)},T=a.prototype;T.isoWeekYear=function(){return l(this).year()},T.isoWeek=function(C){if(!this.$utils().u(C))return this.add(7*(C-this.isoWeek()),r);var g,I,S,p,G=l(this),F=(g=this.isoWeekYear(),I=this.$u,S=(I?h.utc:h)().year(g).startOf("year"),p=4-S.isoWeekday(),S.isoWeekday()>4&&(p+=7),S.add(p,r));return G.diff(F,"week")+1},T.isoWeekday=function(C){return this.$utils().u(C)?this.day()||7:this.day(this.day()%7?C:C-7)};var E=T.startOf;T.startOf=function(C,g){var I=this.$utils(),S=!!I.u(g)||g;return I.p(C)==="isoweek"?S?this.date(this.date()-(this.isoWeekday()-1)).startOf("day"):this.date(this.date()-1-(this.isoWeekday()-1)+7).endOf("day"):E.bind(this)(C,g)}}})})(_e);var br=_e.exports;const xr=Ht(br);var De={exports:{}};(function(t,e){(function(r,n){t.exports=n()})(Bt,function(){var r={LTS:"h:mm:ss A",LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D, YYYY",LLL:"MMMM D, YYYY h:mm A",LLLL:"dddd, MMMM D, YYYY h:mm A"},n=/(\[[^[]*\])|([-_:/.,()\s]+)|(A|a|Q|YYYY|YY?|ww?|MM?M?M?|Do|DD?|hh?|HH?|mm?|ss?|S{1,3}|z|ZZ?)/g,a=/\d/,h=/\d\d/,l=/\d\d?/,T=/\d*[^-_:/,()\s\d]+/,E={},C=function(v){return(v=+v)+(v>68?1900:2e3)},g=function(v){return function(M){this[v]=+M}},I=[/[+-]\d\d:?(\d\d)?|Z/,function(v){(this.zone||(this.zone={})).offset=function(M){if(!M||M==="Z")return 0;var L=M.match(/([+-]|\d\d)/g),Y=60*L[1]+(+L[2]||0);return Y===0?0:L[0]==="+"?-Y:Y}(v)}],S=function(v){var M=E[v];return M&&(M.indexOf?M:M.s.concat(M.f))},p=function(v,M){var L,Y=E.meridiem;if(Y){for(var R=1;R<=24;R+=1)if(v.indexOf(Y(R,0,M))>-1){L=R>12;break}}else L=v===(M?"pm":"PM");return L},G={A:[T,function(v){this.afternoon=p(v,!1)}],a:[T,function(v){this.afternoon=p(v,!0)}],Q:[a,function(v){this.month=3*(v-1)+1}],S:[a,function(v){this.milliseconds=100*+v}],SS:[h,function(v){this.milliseconds=10*+v}],SSS:[/\d{3}/,function(v){this.milliseconds=+v}],s:[l,g("seconds")],ss:[l,g("seconds")],m:[l,g("minutes")],mm:[l,g("minutes")],H:[l,g("hours")],h:[l,g("hours")],HH:[l,g("hours")],hh:[l,g("hours")],D:[l,g("day")],DD:[h,g("day")],Do:[T,function(v){var M=E.ordinal,L=v.match(/\d+/);if(this.day=L[0],M)for(var Y=1;Y<=31;Y+=1)M(Y).replace(/\[|\]/g,"")===v&&(this.day=Y)}],w:[l,g("week")],ww:[h,g("week")],M:[l,g("month")],MM:[h,g("month")],MMM:[T,function(v){var M=S("months"),L=(S("monthsShort")||M.map(function(Y){return Y.slice(0,3)})).indexOf(v)+1;if(L<1)throw new Error;this.month=L%12||L}],MMMM:[T,function(v){var M=S("months").indexOf(v)+1;if(M<1)throw new Error;this.month=M%12||M}],Y:[/[+-]?\d+/,g("year")],YY:[h,function(v){this.year=C(v)}],YYYY:[/\d{4}/,g("year")],Z:I,ZZ:I};function F(v){var M,L;M=v,L=E&&E.formats;for(var Y=(v=M.replace(/(\[[^\]]+])|(LTS?|l{1,4}|L{1,4})/g,function(b,x,m){var _=m&&m.toUpperCase();return x||L[m]||r[m]||L[_].replace(/(\[[^\]]+])|(MMMM|MM|DD|dddd)/g,function(c,u,k){return u||k.slice(1)})})).match(n),R=Y.length,N=0;N<R;N+=1){var X=Y[N],O=G[X],y=O&&O[0],w=O&&O[1];Y[N]=w?{regex:y,parser:w}:X.replace(/^\[|\]$/g,"")}return function(b){for(var x={},m=0,_=0;m<R;m+=1){var c=Y[m];if(typeof c=="string")_+=c.length;else{var u=c.regex,k=c.parser,f=b.slice(_),D=u.exec(f)[0];k.call(x,D),b=b.replace(D,"")}}return function(s){var d=s.afternoon;if(d!==void 0){var i=s.hours;d?i<12&&(s.hours+=12):i===12&&(s.hours=0),delete s.afternoon}}(x),x}}return function(v,M,L){L.p.customParseFormat=!0,v&&v.parseTwoDigitYear&&(C=v.parseTwoDigitYear);var Y=M.prototype,R=Y.parse;Y.parse=function(N){var X=N.date,O=N.utc,y=N.args;this.$u=O;var w=y[1];if(typeof w=="string"){var b=y[2]===!0,x=y[3]===!0,m=b||x,_=y[2];x&&(_=y[2]),E=this.$locale(),!b&&_&&(E=L.Ls[_]),this.$d=function(f,D,s,d){try{if(["x","X"].indexOf(D)>-1)return new Date((D==="X"?1e3:1)*f);var i=F(D)(f),W=i.year,A=i.month,V=i.day,j=i.hours,z=i.minutes,P=i.seconds,$=i.milliseconds,ct=i.zone,ot=i.week,kt=new Date,mt=V||(W||A?1:kt.getDate()),lt=W||kt.getFullYear(),B=0;W&&!A||(B=A>0?A-1:kt.getMonth());var Q,q=j||0,at=z||0,K=P||0,it=$||0;return ct?new Date(Date.UTC(lt,B,mt,q,at,K,it+60*ct.offset*1e3)):s?new Date(Date.UTC(lt,B,mt,q,at,K,it)):(Q=new Date(lt,B,mt,q,at,K,it),ot&&(Q=d(Q).week(ot).toDate()),Q)}catch{return new Date("")}}(X,w,O,L),this.init(),_&&_!==!0&&(this.$L=this.locale(_).$L),m&&X!=this.format(w)&&(this.$d=new Date("")),E={}}else if(w instanceof Array)for(var c=w.length,u=1;u<=c;u+=1){y[1]=w[u-1];var k=L.apply(this,y);if(k.isValid()){this.$d=k.$d,this.$L=k.$L,this.init();break}u===c&&(this.$d=new Date(""))}else R.call(this,N)}}})})(De);var Tr=De.exports;const wr=Ht(Tr);var Se={exports:{}};(function(t,e){(function(r,n){t.exports=n()})(Bt,function(){return function(r,n){var a=n.prototype,h=a.format;a.format=function(l){var T=this,E=this.$locale();if(!this.isValid())return h.bind(this)(l);var C=this.$utils(),g=(l||"YYYY-MM-DDTHH:mm:ssZ").replace(/\[([^\]]+)]|Q|wo|ww|w|WW|W|zzz|z|gggg|GGGG|Do|X|x|k{1,2}|S/g,function(I){switch(I){case"Q":return Math.ceil((T.$M+1)/3);case"Do":return E.ordinal(T.$D);case"gggg":return T.weekYear();case"GGGG":return T.isoWeekYear();case"wo":return E.ordinal(T.week(),"W");case"w":case"ww":return C.s(T.week(),I==="w"?1:2,"0");case"W":case"WW":return C.s(T.isoWeek(),I==="W"?1:2,"0");case"k":case"kk":return C.s(String(T.$H===0?24:T.$H),I==="k"?1:2,"0");case"X":return Math.floor(T.$d.getTime()/1e3);case"x":return T.$d.getTime();case"z":return"["+T.offsetName()+"]";case"zzz":return"["+T.offsetName("long")+"]";default:return I}});return h.bind(this)(g)}}})})(Se);var _r=Se.exports;const Dr=Ht(_r);var Ot=function(){var t=o(function(_,c,u,k){for(u=u||{},k=_.length;k--;u[_[k]]=c);return u},"o"),e=[6,8,10,12,13,14,15,16,17,18,20,21,22,23,24,25,26,27,28,29,30,31,33,35,36,38,40],r=[1,26],n=[1,27],a=[1,28],h=[1,29],l=[1,30],T=[1,31],E=[1,32],C=[1,33],g=[1,34],I=[1,9],S=[1,10],p=[1,11],G=[1,12],F=[1,13],v=[1,14],M=[1,15],L=[1,16],Y=[1,19],R=[1,20],N=[1,21],X=[1,22],O=[1,23],y=[1,25],w=[1,35],b={trace:o(function(){},"trace"),yy:{},symbols_:{error:2,start:3,gantt:4,document:5,EOF:6,line:7,SPACE:8,statement:9,NL:10,weekday:11,weekday_monday:12,weekday_tuesday:13,weekday_wednesday:14,weekday_thursday:15,weekday_friday:16,weekday_saturday:17,weekday_sunday:18,weekend:19,weekend_friday:20,weekend_saturday:21,dateFormat:22,inclusiveEndDates:23,topAxis:24,axisFormat:25,tickInterval:26,excludes:27,includes:28,todayMarker:29,title:30,acc_title:31,acc_title_value:32,acc_descr:33,acc_descr_value:34,acc_descr_multiline_value:35,section:36,clickStatement:37,taskTxt:38,taskData:39,click:40,callbackname:41,callbackargs:42,href:43,clickStatementDebug:44,$accept:0,$end:1},terminals_:{2:"error",4:"gantt",6:"EOF",8:"SPACE",10:"NL",12:"weekday_monday",13:"weekday_tuesday",14:"weekday_wednesday",15:"weekday_thursday",16:"weekday_friday",17:"weekday_saturday",18:"weekday_sunday",20:"weekend_friday",21:"weekend_saturday",22:"dateFormat",23:"inclusiveEndDates",24:"topAxis",25:"axisFormat",26:"tickInterval",27:"excludes",28:"includes",29:"todayMarker",30:"title",31:"acc_title",32:"acc_title_value",33:"acc_descr",34:"acc_descr_value",35:"acc_descr_multiline_value",36:"section",38:"taskTxt",39:"taskData",40:"click",41:"callbackname",42:"callbackargs",43:"href"},productions_:[0,[3,3],[5,0],[5,2],[7,2],[7,1],[7,1],[7,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[19,1],[19,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,2],[9,2],[9,1],[9,1],[9,1],[9,2],[37,2],[37,3],[37,3],[37,4],[37,3],[37,4],[37,2],[44,2],[44,3],[44,3],[44,4],[44,3],[44,4],[44,2]],performAction:o(function(c,u,k,f,D,s,d){var i=s.length-1;switch(D){case 1:return s[i-1];case 2:this.$=[];break;case 3:s[i-1].push(s[i]),this.$=s[i-1];break;case 4:case 5:this.$=s[i];break;case 6:case 7:this.$=[];break;case 8:f.setWeekday("monday");break;case 9:f.setWeekday("tuesday");break;case 10:f.setWeekday("wednesday");break;case 11:f.setWeekday("thursday");break;case 12:f.setWeekday("friday");break;case 13:f.setWeekday("saturday");break;case 14:f.setWeekday("sunday");break;case 15:f.setWeekend("friday");break;case 16:f.setWeekend("saturday");break;case 17:f.setDateFormat(s[i].substr(11)),this.$=s[i].substr(11);break;case 18:f.enableInclusiveEndDates(),this.$=s[i].substr(18);break;case 19:f.TopAxis(),this.$=s[i].substr(8);break;case 20:f.setAxisFormat(s[i].substr(11)),this.$=s[i].substr(11);break;case 21:f.setTickInterval(s[i].substr(13)),this.$=s[i].substr(13);break;case 22:f.setExcludes(s[i].substr(9)),this.$=s[i].substr(9);break;case 23:f.setIncludes(s[i].substr(9)),this.$=s[i].substr(9);break;case 24:f.setTodayMarker(s[i].substr(12)),this.$=s[i].substr(12);break;case 27:f.setDiagramTitle(s[i].substr(6)),this.$=s[i].substr(6);break;case 28:this.$=s[i].trim(),f.setAccTitle(this.$);break;case 29:case 30:this.$=s[i].trim(),f.setAccDescription(this.$);break;case 31:f.addSection(s[i].substr(8)),this.$=s[i].substr(8);break;case 33:f.addTask(s[i-1],s[i]),this.$="task";break;case 34:this.$=s[i-1],f.setClickEvent(s[i-1],s[i],null);break;case 35:this.$=s[i-2],f.setClickEvent(s[i-2],s[i-1],s[i]);break;case 36:this.$=s[i-2],f.setClickEvent(s[i-2],s[i-1],null),f.setLink(s[i-2],s[i]);break;case 37:this.$=s[i-3],f.setClickEvent(s[i-3],s[i-2],s[i-1]),f.setLink(s[i-3],s[i]);break;case 38:this.$=s[i-2],f.setClickEvent(s[i-2],s[i],null),f.setLink(s[i-2],s[i-1]);break;case 39:this.$=s[i-3],f.setClickEvent(s[i-3],s[i-1],s[i]),f.setLink(s[i-3],s[i-2]);break;case 40:this.$=s[i-1],f.setLink(s[i-1],s[i]);break;case 41:case 47:this.$=s[i-1]+" "+s[i];break;case 42:case 43:case 45:this.$=s[i-2]+" "+s[i-1]+" "+s[i];break;case 44:case 46:this.$=s[i-3]+" "+s[i-2]+" "+s[i-1]+" "+s[i];break}},"anonymous"),table:[{3:1,4:[1,2]},{1:[3]},t(e,[2,2],{5:3}),{6:[1,4],7:5,8:[1,6],9:7,10:[1,8],11:17,12:r,13:n,14:a,15:h,16:l,17:T,18:E,19:18,20:C,21:g,22:I,23:S,24:p,25:G,26:F,27:v,28:M,29:L,30:Y,31:R,33:N,35:X,36:O,37:24,38:y,40:w},t(e,[2,7],{1:[2,1]}),t(e,[2,3]),{9:36,11:17,12:r,13:n,14:a,15:h,16:l,17:T,18:E,19:18,20:C,21:g,22:I,23:S,24:p,25:G,26:F,27:v,28:M,29:L,30:Y,31:R,33:N,35:X,36:O,37:24,38:y,40:w},t(e,[2,5]),t(e,[2,6]),t(e,[2,17]),t(e,[2,18]),t(e,[2,19]),t(e,[2,20]),t(e,[2,21]),t(e,[2,22]),t(e,[2,23]),t(e,[2,24]),t(e,[2,25]),t(e,[2,26]),t(e,[2,27]),{32:[1,37]},{34:[1,38]},t(e,[2,30]),t(e,[2,31]),t(e,[2,32]),{39:[1,39]},t(e,[2,8]),t(e,[2,9]),t(e,[2,10]),t(e,[2,11]),t(e,[2,12]),t(e,[2,13]),t(e,[2,14]),t(e,[2,15]),t(e,[2,16]),{41:[1,40],43:[1,41]},t(e,[2,4]),t(e,[2,28]),t(e,[2,29]),t(e,[2,33]),t(e,[2,34],{42:[1,42],43:[1,43]}),t(e,[2,40],{41:[1,44]}),t(e,[2,35],{43:[1,45]}),t(e,[2,36]),t(e,[2,38],{42:[1,46]}),t(e,[2,37]),t(e,[2,39])],defaultActions:{},parseError:o(function(c,u){if(u.recoverable)this.trace(c);else{var k=new Error(c);throw k.hash=u,k}},"parseError"),parse:o(function(c){var u=this,k=[0],f=[],D=[null],s=[],d=this.table,i="",W=0,A=0,V=2,j=1,z=s.slice.call(arguments,1),P=Object.create(this.lexer),$={yy:{}};for(var ct in this.yy)Object.prototype.hasOwnProperty.call(this.yy,ct)&&($.yy[ct]=this.yy[ct]);P.setInput(c,$.yy),$.yy.lexer=P,$.yy.parser=this,typeof P.yylloc>"u"&&(P.yylloc={});var ot=P.yylloc;s.push(ot);var kt=P.options&&P.options.ranges;typeof $.yy.parseError=="function"?this.parseError=$.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function mt(Z){k.length=k.length-2*Z,D.length=D.length-Z,s.length=s.length-Z}o(mt,"popStack");function lt(){var Z;return Z=f.pop()||P.lex()||j,typeof Z!="number"&&(Z instanceof Array&&(f=Z,Z=f.pop()),Z=u.symbols_[Z]||Z),Z}o(lt,"lex");for(var B,Q,q,at,K={},it,J,te,vt;;){if(Q=k[k.length-1],this.defaultActions[Q]?q=this.defaultActions[Q]:((B===null||typeof B>"u")&&(B=lt()),q=d[Q]&&d[Q][B]),typeof q>"u"||!q.length||!q[0]){var Mt="";vt=[];for(it in d[Q])this.terminals_[it]&&it>V&&vt.push("'"+this.terminals_[it]+"'");P.showPosition?Mt="Parse error on line "+(W+1)+`:
`+P.showPosition()+`
Expecting `+vt.join(", ")+", got '"+(this.terminals_[B]||B)+"'":Mt="Parse error on line "+(W+1)+": Unexpected "+(B==j?"end of input":"'"+(this.terminals_[B]||B)+"'"),this.parseError(Mt,{text:P.match,token:this.terminals_[B]||B,line:P.yylineno,loc:ot,expected:vt})}if(q[0]instanceof Array&&q.length>1)throw new Error("Parse Error: multiple actions possible at state: "+Q+", token: "+B);switch(q[0]){case 1:k.push(B),D.push(P.yytext),s.push(P.yylloc),k.push(q[1]),B=null,A=P.yyleng,i=P.yytext,W=P.yylineno,ot=P.yylloc;break;case 2:if(J=this.productions_[q[1]][1],K.$=D[D.length-J],K._$={first_line:s[s.length-(J||1)].first_line,last_line:s[s.length-1].last_line,first_column:s[s.length-(J||1)].first_column,last_column:s[s.length-1].last_column},kt&&(K._$.range=[s[s.length-(J||1)].range[0],s[s.length-1].range[1]]),at=this.performAction.apply(K,[i,A,W,$.yy,q[1],D,s].concat(z)),typeof at<"u")return at;J&&(k=k.slice(0,-1*J*2),D=D.slice(0,-1*J),s=s.slice(0,-1*J)),k.push(this.productions_[q[1]][0]),D.push(K.$),s.push(K._$),te=d[k[k.length-2]][k[k.length-1]],k.push(te);break;case 3:return!0}}return!0},"parse")},x=function(){var _={EOF:1,parseError:o(function(u,k){if(this.yy.parser)this.yy.parser.parseError(u,k);else throw new Error(u)},"parseError"),setInput:o(function(c,u){return this.yy=u||this.yy||{},this._input=c,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},"setInput"),input:o(function(){var c=this._input[0];this.yytext+=c,this.yyleng++,this.offset++,this.match+=c,this.matched+=c;var u=c.match(/(?:\r\n?|\n).*/g);return u?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),c},"input"),unput:o(function(c){var u=c.length,k=c.split(/(?:\r\n?|\n)/g);this._input=c+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-u),this.offset-=u;var f=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),k.length-1&&(this.yylineno-=k.length-1);var D=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:k?(k.length===f.length?this.yylloc.first_column:0)+f[f.length-k.length].length-k[0].length:this.yylloc.first_column-u},this.options.ranges&&(this.yylloc.range=[D[0],D[0]+this.yyleng-u]),this.yyleng=this.yytext.length,this},"unput"),more:o(function(){return this._more=!0,this},"more"),reject:o(function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError("Lexical error on line "+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:"",token:null,line:this.yylineno});return this},"reject"),less:o(function(c){this.unput(this.match.slice(c))},"less"),pastInput:o(function(){var c=this.matched.substr(0,this.matched.length-this.match.length);return(c.length>20?"...":"")+c.substr(-20).replace(/\n/g,"")},"pastInput"),upcomingInput:o(function(){var c=this.match;return c.length<20&&(c+=this._input.substr(0,20-c.length)),(c.substr(0,20)+(c.length>20?"...":"")).replace(/\n/g,"")},"upcomingInput"),showPosition:o(function(){var c=this.pastInput(),u=new Array(c.length+1).join("-");return c+this.upcomingInput()+`
`+u+"^"},"showPosition"),test_match:o(function(c,u){var k,f,D;if(this.options.backtrack_lexer&&(D={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(D.yylloc.range=this.yylloc.range.slice(0))),f=c[0].match(/(?:\r\n?|\n).*/g),f&&(this.yylineno+=f.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:f?f[f.length-1].length-f[f.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+c[0].length},this.yytext+=c[0],this.match+=c[0],this.matches=c,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(c[0].length),this.matched+=c[0],k=this.performAction.call(this,this.yy,this,u,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),k)return k;if(this._backtrack){for(var s in D)this[s]=D[s];return!1}return!1},"test_match"),next:o(function(){if(this.done)return this.EOF;this._input||(this.done=!0);var c,u,k,f;this._more||(this.yytext="",this.match="");for(var D=this._currentRules(),s=0;s<D.length;s++)if(k=this._input.match(this.rules[D[s]]),k&&(!u||k[0].length>u[0].length)){if(u=k,f=s,this.options.backtrack_lexer){if(c=this.test_match(k,D[s]),c!==!1)return c;if(this._backtrack){u=!1;continue}else return!1}else if(!this.options.flex)break}return u?(c=this.test_match(u,D[f]),c!==!1?c:!1):this._input===""?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:"",token:null,line:this.yylineno})},"next"),lex:o(function(){var u=this.next();return u||this.lex()},"lex"),begin:o(function(u){this.conditionStack.push(u)},"begin"),popState:o(function(){var u=this.conditionStack.length-1;return u>0?this.conditionStack.pop():this.conditionStack[0]},"popState"),_currentRules:o(function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},"_currentRules"),topState:o(function(u){return u=this.conditionStack.length-1-Math.abs(u||0),u>=0?this.conditionStack[u]:"INITIAL"},"topState"),pushState:o(function(u){this.begin(u)},"pushState"),stateStackSize:o(function(){return this.conditionStack.length},"stateStackSize"),options:{"case-insensitive":!0},performAction:o(function(u,k,f,D){switch(f){case 0:return this.begin("open_directive"),"open_directive";case 1:return this.begin("acc_title"),31;case 2:return this.popState(),"acc_title_value";case 3:return this.begin("acc_descr"),33;case 4:return this.popState(),"acc_descr_value";case 5:this.begin("acc_descr_multiline");break;case 6:this.popState();break;case 7:return"acc_descr_multiline_value";case 8:break;case 9:break;case 10:break;case 11:return 10;case 12:break;case 13:break;case 14:this.begin("href");break;case 15:this.popState();break;case 16:return 43;case 17:this.begin("callbackname");break;case 18:this.popState();break;case 19:this.popState(),this.begin("callbackargs");break;case 20:return 41;case 21:this.popState();break;case 22:return 42;case 23:this.begin("click");break;case 24:this.popState();break;case 25:return 40;case 26:return 4;case 27:return 22;case 28:return 23;case 29:return 24;case 30:return 25;case 31:return 26;case 32:return 28;case 33:return 27;case 34:return 29;case 35:return 12;case 36:return 13;case 37:return 14;case 38:return 15;case 39:return 16;case 40:return 17;case 41:return 18;case 42:return 20;case 43:return 21;case 44:return"date";case 45:return 30;case 46:return"accDescription";case 47:return 36;case 48:return 38;case 49:return 39;case 50:return":";case 51:return 6;case 52:return"INVALID"}},"anonymous"),rules:[/^(?:%%\{)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:%%(?!\{)*[^\n]*)/i,/^(?:[^\}]%%*[^\n]*)/i,/^(?:%%*[^\n]*[\n]*)/i,/^(?:[\n]+)/i,/^(?:\s+)/i,/^(?:%[^\n]*)/i,/^(?:href[\s]+["])/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:call[\s]+)/i,/^(?:\([\s]*\))/i,/^(?:\()/i,/^(?:[^(]*)/i,/^(?:\))/i,/^(?:[^)]*)/i,/^(?:click[\s]+)/i,/^(?:[\s\n])/i,/^(?:[^\s\n]*)/i,/^(?:gantt\b)/i,/^(?:dateFormat\s[^#\n;]+)/i,/^(?:inclusiveEndDates\b)/i,/^(?:topAxis\b)/i,/^(?:axisFormat\s[^#\n;]+)/i,/^(?:tickInterval\s[^#\n;]+)/i,/^(?:includes\s[^#\n;]+)/i,/^(?:excludes\s[^#\n;]+)/i,/^(?:todayMarker\s[^\n;]+)/i,/^(?:weekday\s+monday\b)/i,/^(?:weekday\s+tuesday\b)/i,/^(?:weekday\s+wednesday\b)/i,/^(?:weekday\s+thursday\b)/i,/^(?:weekday\s+friday\b)/i,/^(?:weekday\s+saturday\b)/i,/^(?:weekday\s+sunday\b)/i,/^(?:weekend\s+friday\b)/i,/^(?:weekend\s+saturday\b)/i,/^(?:\d\d\d\d-\d\d-\d\d\b)/i,/^(?:title\s[^\n]+)/i,/^(?:accDescription\s[^#\n;]+)/i,/^(?:section\s[^\n]+)/i,/^(?:[^:\n]+)/i,/^(?::[^#\n;]+)/i,/^(?::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{acc_descr_multiline:{rules:[6,7],inclusive:!1},acc_descr:{rules:[4],inclusive:!1},acc_title:{rules:[2],inclusive:!1},callbackargs:{rules:[21,22],inclusive:!1},callbackname:{rules:[18,19,20],inclusive:!1},href:{rules:[15,16],inclusive:!1},click:{rules:[24,25],inclusive:!1},INITIAL:{rules:[0,1,3,5,8,9,10,11,12,13,14,17,23,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52],inclusive:!0}}};return _}();b.lexer=x;function m(){this.yy={}}return o(m,"Parser"),m.prototype=b,b.Parser=m,new m}();Ot.parser=Ot;var Sr=Ot;U.extend(xr);U.extend(wr);U.extend(Dr);var le={friday:5,saturday:6},tt="",Gt="",Xt=void 0,jt="",yt=[],gt=[],qt=new Map,Ut=[],Ct=[],ht="",Zt="",Ce=["active","done","crit","milestone"],Qt=[],pt=!1,$t=!1,Kt="sunday",Et="saturday",Pt=0,Cr=o(function(){Ut=[],Ct=[],ht="",Qt=[],wt=0,Rt=void 0,_t=void 0,H=[],tt="",Gt="",Zt="",Xt=void 0,jt="",yt=[],gt=[],pt=!1,$t=!1,Pt=0,qt=new Map,He(),Kt="sunday",Et="saturday"},"clear"),Er=o(function(t){Gt=t},"setAxisFormat"),Mr=o(function(){return Gt},"getAxisFormat"),Ar=o(function(t){Xt=t},"setTickInterval"),Ir=o(function(){return Xt},"getTickInterval"),Fr=o(function(t){jt=t},"setTodayMarker"),Lr=o(function(){return jt},"getTodayMarker"),Yr=o(function(t){tt=t},"setDateFormat"),Wr=o(function(){pt=!0},"enableInclusiveEndDates"),Vr=o(function(){return pt},"endDatesAreInclusive"),zr=o(function(){$t=!0},"enableTopAxis"),Or=o(function(){return $t},"topAxisEnabled"),Pr=o(function(t){Zt=t},"setDisplayMode"),Nr=o(function(){return Zt},"getDisplayMode"),Rr=o(function(){return tt},"getDateFormat"),Br=o(function(t){yt=t.toLowerCase().split(/[\s,]+/)},"setIncludes"),Hr=o(function(){return yt},"getIncludes"),Gr=o(function(t){gt=t.toLowerCase().split(/[\s,]+/)},"setExcludes"),Xr=o(function(){return gt},"getExcludes"),jr=o(function(){return qt},"getLinks"),qr=o(function(t){ht=t,Ut.push(t)},"addSection"),Ur=o(function(){return Ut},"getSections"),Zr=o(function(){let t=ue();const e=10;let r=0;for(;!t&&r<e;)t=ue(),r++;return Ct=H,Ct},"getTasks"),Ee=o(function(t,e,r,n){return n.includes(t.format(e.trim()))?!1:r.includes("weekends")&&(t.isoWeekday()===le[Et]||t.isoWeekday()===le[Et]+1)||r.includes(t.format("dddd").toLowerCase())?!0:r.includes(t.format(e.trim()))},"isInvalidDate"),Qr=o(function(t){Kt=t},"setWeekday"),$r=o(function(){return Kt},"getWeekday"),Kr=o(function(t){Et=t},"setWeekend"),Me=o(function(t,e,r,n){if(!r.length||t.manualEndTime)return;let a;t.startTime instanceof Date?a=U(t.startTime):a=U(t.startTime,e,!0),a=a.add(1,"d");let h;t.endTime instanceof Date?h=U(t.endTime):h=U(t.endTime,e,!0);const[l,T]=Jr(a,h,e,r,n);t.endTime=l.toDate(),t.renderEndTime=T},"checkTaskDates"),Jr=o(function(t,e,r,n,a){let h=!1,l=null;for(;t<=e;)h||(l=e.toDate()),h=Ee(t,r,n,a),h&&(e=e.add(1,"d")),t=t.add(1,"d");return[e,l]},"fixTaskDates"),Nt=o(function(t,e,r){r=r.trim();const a=/^after\s+(?<ids>[\d\w- ]+)/.exec(r);if(a!==null){let l=null;for(const E of a.groups.ids.split(" ")){let C=st(E);C!==void 0&&(!l||C.endTime>l.endTime)&&(l=C)}if(l)return l.endTime;const T=new Date;return T.setHours(0,0,0,0),T}let h=U(r,e.trim(),!0);if(h.isValid())return h.toDate();{Dt.debug("Invalid date:"+r),Dt.debug("With date format:"+e.trim());const l=new Date(r);if(l===void 0||isNaN(l.getTime())||l.getFullYear()<-1e4||l.getFullYear()>1e4)throw new Error("Invalid date:"+r);return l}},"getStartDate"),Ae=o(function(t){const e=/^(\d+(?:\.\d+)?)([Mdhmswy]|ms)$/.exec(t.trim());return e!==null?[Number.parseFloat(e[1]),e[2]]:[NaN,"ms"]},"parseDuration"),Ie=o(function(t,e,r,n=!1){r=r.trim();const h=/^until\s+(?<ids>[\d\w- ]+)/.exec(r);if(h!==null){let g=null;for(const S of h.groups.ids.split(" ")){let p=st(S);p!==void 0&&(!g||p.startTime<g.startTime)&&(g=p)}if(g)return g.startTime;const I=new Date;return I.setHours(0,0,0,0),I}let l=U(r,e.trim(),!0);if(l.isValid())return n&&(l=l.add(1,"d")),l.toDate();let T=U(t);const[E,C]=Ae(r);if(!Number.isNaN(E)){const g=T.add(E,C);g.isValid()&&(T=g)}return T.toDate()},"getEndDate"),wt=0,ft=o(function(t){return t===void 0?(wt=wt+1,"task"+wt):t},"parseId"),tn=o(function(t,e){let r;e.substr(0,1)===":"?r=e.substr(1,e.length):r=e;const n=r.split(","),a={};Jt(n,a,Ce);for(let l=0;l<n.length;l++)n[l]=n[l].trim();let h="";switch(n.length){case 1:a.id=ft(),a.startTime=t.endTime,h=n[0];break;case 2:a.id=ft(),a.startTime=Nt(void 0,tt,n[0]),h=n[1];break;case 3:a.id=ft(n[0]),a.startTime=Nt(void 0,tt,n[1]),h=n[2];break}return h&&(a.endTime=Ie(a.startTime,tt,h,pt),a.manualEndTime=U(h,"YYYY-MM-DD",!0).isValid(),Me(a,tt,gt,yt)),a},"compileData"),en=o(function(t,e){let r;e.substr(0,1)===":"?r=e.substr(1,e.length):r=e;const n=r.split(","),a={};Jt(n,a,Ce);for(let h=0;h<n.length;h++)n[h]=n[h].trim();switch(n.length){case 1:a.id=ft(),a.startTime={type:"prevTaskEnd",id:t},a.endTime={data:n[0]};break;case 2:a.id=ft(),a.startTime={type:"getStartDate",startData:n[0]},a.endTime={data:n[1]};break;case 3:a.id=ft(n[0]),a.startTime={type:"getStartDate",startData:n[1]},a.endTime={data:n[2]};break}return a},"parseData"),Rt,_t,H=[],Fe={},rn=o(function(t,e){const r={section:ht,type:ht,processed:!1,manualEndTime:!1,renderEndTime:null,raw:{data:e},task:t,classes:[]},n=en(_t,e);r.raw.startTime=n.startTime,r.raw.endTime=n.endTime,r.id=n.id,r.prevTaskId=_t,r.active=n.active,r.done=n.done,r.crit=n.crit,r.milestone=n.milestone,r.order=Pt,Pt++;const a=H.push(r);_t=r.id,Fe[r.id]=a-1},"addTask"),st=o(function(t){const e=Fe[t];return H[e]},"findTaskById"),nn=o(function(t,e){const r={section:ht,type:ht,description:t,task:t,classes:[]},n=tn(Rt,e);r.startTime=n.startTime,r.endTime=n.endTime,r.id=n.id,r.active=n.active,r.done=n.done,r.crit=n.crit,r.milestone=n.milestone,Rt=r,Ct.push(r)},"addTaskOrg"),ue=o(function(){const t=o(function(r){const n=H[r];let a="";switch(H[r].raw.startTime.type){case"prevTaskEnd":{const h=st(n.prevTaskId);n.startTime=h.endTime;break}case"getStartDate":a=Nt(void 0,tt,H[r].raw.startTime.startData),a&&(H[r].startTime=a);break}return H[r].startTime&&(H[r].endTime=Ie(H[r].startTime,tt,H[r].raw.endTime.data,pt),H[r].endTime&&(H[r].processed=!0,H[r].manualEndTime=U(H[r].raw.endTime.data,"YYYY-MM-DD",!0).isValid(),Me(H[r],tt,gt,yt))),H[r].processed},"compileTask");let e=!0;for(const[r,n]of H.entries())t(r),e=e&&n.processed;return e},"compileTasks"),an=o(function(t,e){let r=e;ut().securityLevel!=="loose"&&(r=Ge(e)),t.split(",").forEach(function(n){st(n)!==void 0&&(Ye(n,()=>{window.open(r,"_self")}),qt.set(n,r))}),Le(t,"clickable")},"setLink"),Le=o(function(t,e){t.split(",").forEach(function(r){let n=st(r);n!==void 0&&n.classes.push(e)})},"setClass"),sn=o(function(t,e,r){if(ut().securityLevel!=="loose"||e===void 0)return;let n=[];if(typeof r=="string"){n=r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);for(let h=0;h<n.length;h++){let l=n[h].trim();l.startsWith('"')&&l.endsWith('"')&&(l=l.substr(1,l.length-2)),n[h]=l}}n.length===0&&n.push(t),st(t)!==void 0&&Ye(t,()=>{$e.runFunc(e,...n)})},"setClickFun"),Ye=o(function(t,e){Qt.push(function(){const r=document.querySelector(`[id="${t}"]`);r!==null&&r.addEventListener("click",function(){e()})},function(){const r=document.querySelector(`[id="${t}-text"]`);r!==null&&r.addEventListener("click",function(){e()})})},"pushFun"),cn=o(function(t,e,r){t.split(",").forEach(function(n){sn(n,e,r)}),Le(t,"clickable")},"setClickEvent"),on=o(function(t){Qt.forEach(function(e){e(t)})},"bindFunctions"),ln={getConfig:o(()=>ut().gantt,"getConfig"),clear:Cr,setDateFormat:Yr,getDateFormat:Rr,enableInclusiveEndDates:Wr,endDatesAreInclusive:Vr,enableTopAxis:zr,topAxisEnabled:Or,setAxisFormat:Er,getAxisFormat:Mr,setTickInterval:Ar,getTickInterval:Ir,setTodayMarker:Fr,getTodayMarker:Lr,setAccTitle:ze,getAccTitle:Oe,setDiagramTitle:Pe,getDiagramTitle:Ne,setDisplayMode:Pr,getDisplayMode:Nr,setAccDescription:Re,getAccDescription:Be,addSection:qr,getSections:Ur,getTasks:Zr,addTask:rn,findTaskById:st,addTaskOrg:nn,setIncludes:Br,getIncludes:Hr,setExcludes:Gr,getExcludes:Xr,setClickEvent:cn,setLink:an,getLinks:jr,bindFunctions:on,parseDuration:Ae,isInvalidDate:Ee,setWeekday:Qr,getWeekday:$r,setWeekend:Kr};function Jt(t,e,r){let n=!0;for(;n;)n=!1,r.forEach(function(a){const h="^\\s*"+a+"\\s*$",l=new RegExp(h);t[0].match(l)&&(e[a]=!0,t.shift(1),n=!0)})}o(Jt,"getTaskTags");var un=o(function(){Dt.debug("Something is calling, setConf, remove the call")},"setConf"),de={monday:Ke,tuesday:Je,wednesday:tr,thursday:er,friday:rr,saturday:nr,sunday:ir},dn=o((t,e)=>{let r=[...t].map(()=>-1/0),n=[...t].sort((h,l)=>h.startTime-l.startTime||h.order-l.order),a=0;for(const h of n)for(let l=0;l<r.length;l++)if(h.startTime>=r[l]){r[l]=h.endTime,h.order=l+e,l>a&&(a=l);break}return a},"getMaxIntersections"),rt,fn=o(function(t,e,r,n){const a=ut().gantt,h=ut().securityLevel;let l;h==="sandbox"&&(l=bt("#i"+e));const T=h==="sandbox"?bt(l.nodes()[0].contentDocument.body):bt("body"),E=h==="sandbox"?l.nodes()[0].contentDocument:document,C=E.getElementById(e);rt=C.parentElement.offsetWidth,rt===void 0&&(rt=1200),a.useWidth!==void 0&&(rt=a.useWidth);const g=n.db.getTasks();let I=[];for(const y of g)I.push(y.type);I=O(I);const S={};let p=2*a.topPadding;if(n.db.getDisplayMode()==="compact"||a.displayMode==="compact"){const y={};for(const b of g)y[b.section]===void 0?y[b.section]=[b]:y[b.section].push(b);let w=0;for(const b of Object.keys(y)){const x=dn(y[b],w)+1;w+=x,p+=x*(a.barHeight+a.barGap),S[b]=x}}else{p+=g.length*(a.barHeight+a.barGap);for(const y of I)S[y]=g.filter(w=>w.type===y).length}C.setAttribute("viewBox","0 0 "+rt+" "+p);const G=T.select(`[id="${e}"]`),F=Xe().domain([je(g,function(y){return y.startTime}),qe(g,function(y){return y.endTime})]).rangeRound([0,rt-a.leftPadding-a.rightPadding]);function v(y,w){const b=y.startTime,x=w.startTime;let m=0;return b>x?m=1:b<x&&(m=-1),m}o(v,"taskCompare"),g.sort(v),M(g,rt,p),Ue(G,p,rt,a.useMaxWidth),G.append("text").text(n.db.getDiagramTitle()).attr("x",rt/2).attr("y",a.titleTopMargin).attr("class","titleText");function M(y,w,b){const x=a.barHeight,m=x+a.barGap,_=a.topPadding,c=a.leftPadding,u=Ze().domain([0,I.length]).range(["#00B9FA","#F95002"]).interpolate(dr);Y(m,_,c,w,b,y,n.db.getExcludes(),n.db.getIncludes()),R(c,_,w,b),L(y,m,_,c,x,u,w),N(m,_),X(c,_,w,b)}o(M,"makeGantt");function L(y,w,b,x,m,_,c){const k=[...new Set(y.map(d=>d.order))].map(d=>y.find(i=>i.order===d));G.append("g").selectAll("rect").data(k).enter().append("rect").attr("x",0).attr("y",function(d,i){return i=d.order,i*w+b-2}).attr("width",function(){return c-a.rightPadding/2}).attr("height",w).attr("class",function(d){for(const[i,W]of I.entries())if(d.type===W)return"section section"+i%a.numberSectionStyles;return"section section0"});const f=G.append("g").selectAll("rect").data(y).enter(),D=n.db.getLinks();if(f.append("rect").attr("id",function(d){return d.id}).attr("rx",3).attr("ry",3).attr("x",function(d){return d.milestone?F(d.startTime)+x+.5*(F(d.endTime)-F(d.startTime))-.5*m:F(d.startTime)+x}).attr("y",function(d,i){return i=d.order,i*w+b}).attr("width",function(d){return d.milestone?m:F(d.renderEndTime||d.endTime)-F(d.startTime)}).attr("height",m).attr("transform-origin",function(d,i){return i=d.order,(F(d.startTime)+x+.5*(F(d.endTime)-F(d.startTime))).toString()+"px "+(i*w+b+.5*m).toString()+"px"}).attr("class",function(d){const i="task";let W="";d.classes.length>0&&(W=d.classes.join(" "));let A=0;for(const[j,z]of I.entries())d.type===z&&(A=j%a.numberSectionStyles);let V="";return d.active?d.crit?V+=" activeCrit":V=" active":d.done?d.crit?V=" doneCrit":V=" done":d.crit&&(V+=" crit"),V.length===0&&(V=" task"),d.milestone&&(V=" milestone "+V),V+=A,V+=" "+W,i+V}),f.append("text").attr("id",function(d){return d.id+"-text"}).text(function(d){return d.task}).attr("font-size",a.fontSize).attr("x",function(d){let i=F(d.startTime),W=F(d.renderEndTime||d.endTime);d.milestone&&(i+=.5*(F(d.endTime)-F(d.startTime))-.5*m),d.milestone&&(W=i+m);const A=this.getBBox().width;return A>W-i?W+A+1.5*a.leftPadding>c?i+x-5:W+x+5:(W-i)/2+i+x}).attr("y",function(d,i){return i=d.order,i*w+a.barHeight/2+(a.fontSize/2-2)+b}).attr("text-height",m).attr("class",function(d){const i=F(d.startTime);let W=F(d.endTime);d.milestone&&(W=i+m);const A=this.getBBox().width;let V="";d.classes.length>0&&(V=d.classes.join(" "));let j=0;for(const[P,$]of I.entries())d.type===$&&(j=P%a.numberSectionStyles);let z="";return d.active&&(d.crit?z="activeCritText"+j:z="activeText"+j),d.done?d.crit?z=z+" doneCritText"+j:z=z+" doneText"+j:d.crit&&(z=z+" critText"+j),d.milestone&&(z+=" milestoneText"),A>W-i?W+A+1.5*a.leftPadding>c?V+" taskTextOutsideLeft taskTextOutside"+j+" "+z:V+" taskTextOutsideRight taskTextOutside"+j+" "+z+" width-"+A:V+" taskText taskText"+j+" "+z+" width-"+A}),ut().securityLevel==="sandbox"){let d;d=bt("#i"+e);const i=d.nodes()[0].contentDocument;f.filter(function(W){return D.has(W.id)}).each(function(W){var A=i.querySelector("#"+W.id),V=i.querySelector("#"+W.id+"-text");const j=A.parentNode;var z=i.createElement("a");z.setAttribute("xlink:href",D.get(W.id)),z.setAttribute("target","_top"),j.appendChild(z),z.appendChild(A),z.appendChild(V)})}}o(L,"drawRects");function Y(y,w,b,x,m,_,c,u){if(c.length===0&&u.length===0)return;let k,f;for(const{startTime:A,endTime:V}of _)(k===void 0||A<k)&&(k=A),(f===void 0||V>f)&&(f=V);if(!k||!f)return;if(U(f).diff(U(k),"year")>5){Dt.warn("The difference between the min and max time is more than 5 years. This will cause performance issues. Skipping drawing exclude days.");return}const D=n.db.getDateFormat(),s=[];let d=null,i=U(k);for(;i.valueOf()<=f;)n.db.isInvalidDate(i,D,c,u)?d?d.end=i:d={start:i,end:i}:d&&(s.push(d),d=null),i=i.add(1,"d");G.append("g").selectAll("rect").data(s).enter().append("rect").attr("id",function(A){return"exclude-"+A.start.format("YYYY-MM-DD")}).attr("x",function(A){return F(A.start)+b}).attr("y",a.gridLineStartPadding).attr("width",function(A){const V=A.end.add(1,"day");return F(V)-F(A.start)}).attr("height",m-w-a.gridLineStartPadding).attr("transform-origin",function(A,V){return(F(A.start)+b+.5*(F(A.end)-F(A.start))).toString()+"px "+(V*y+.5*m).toString()+"px"}).attr("class","exclude-range")}o(Y,"drawExcludeDays");function R(y,w,b,x){let m=vr(F).tickSize(-x+w+a.gridLineStartPadding).tickFormat(ee(n.db.getAxisFormat()||a.axisFormat||"%Y-%m-%d"));const c=/^([1-9]\d*)(millisecond|second|minute|hour|day|week|month)$/.exec(n.db.getTickInterval()||a.tickInterval);if(c!==null){const u=c[1],k=c[2],f=n.db.getWeekday()||a.weekday;switch(k){case"millisecond":m.ticks(ce.every(u));break;case"second":m.ticks(se.every(u));break;case"minute":m.ticks(ae.every(u));break;case"hour":m.ticks(ie.every(u));break;case"day":m.ticks(ne.every(u));break;case"week":m.ticks(de[f].every(u));break;case"month":m.ticks(re.every(u));break}}if(G.append("g").attr("class","grid").attr("transform","translate("+y+", "+(x-50)+")").call(m).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10).attr("dy","1em"),n.db.topAxisEnabled()||a.topAxis){let u=pr(F).tickSize(-x+w+a.gridLineStartPadding).tickFormat(ee(n.db.getAxisFormat()||a.axisFormat||"%Y-%m-%d"));if(c!==null){const k=c[1],f=c[2],D=n.db.getWeekday()||a.weekday;switch(f){case"millisecond":u.ticks(ce.every(k));break;case"second":u.ticks(se.every(k));break;case"minute":u.ticks(ae.every(k));break;case"hour":u.ticks(ie.every(k));break;case"day":u.ticks(ne.every(k));break;case"week":u.ticks(de[D].every(k));break;case"month":u.ticks(re.every(k));break}}G.append("g").attr("class","grid").attr("transform","translate("+y+", "+w+")").call(u).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10)}}o(R,"makeGrid");function N(y,w){let b=0;const x=Object.keys(S).map(m=>[m,S[m]]);G.append("g").selectAll("text").data(x).enter().append(function(m){const _=m[0].split(Qe.lineBreakRegex),c=-(_.length-1)/2,u=E.createElementNS("http://www.w3.org/2000/svg","text");u.setAttribute("dy",c+"em");for(const[k,f]of _.entries()){const D=E.createElementNS("http://www.w3.org/2000/svg","tspan");D.setAttribute("alignment-baseline","central"),D.setAttribute("x","10"),k>0&&D.setAttribute("dy","1em"),D.textContent=f,u.appendChild(D)}return u}).attr("x",10).attr("y",function(m,_){if(_>0)for(let c=0;c<_;c++)return b+=x[_-1][1],m[1]*y/2+b*y+w;else return m[1]*y/2+w}).attr("font-size",a.sectionFontSize).attr("class",function(m){for(const[_,c]of I.entries())if(m[0]===c)return"sectionTitle sectionTitle"+_%a.numberSectionStyles;return"sectionTitle"})}o(N,"vertLabels");function X(y,w,b,x){const m=n.db.getTodayMarker();if(m==="off")return;const _=G.append("g").attr("class","today"),c=new Date,u=_.append("line");u.attr("x1",F(c)+y).attr("x2",F(c)+y).attr("y1",a.titleTopMargin).attr("y2",x-a.titleTopMargin).attr("class","today"),m!==""&&u.attr("style",m.replace(/,/g,";"))}o(X,"drawToday");function O(y){const w={},b=[];for(let x=0,m=y.length;x<m;++x)Object.prototype.hasOwnProperty.call(w,y[x])||(w[y[x]]=!0,b.push(y[x]));return b}o(O,"checkUnique")},"draw"),hn={setConf:un,draw:fn},kn=o(t=>`
  .mermaid-main-font {
        font-family: ${t.fontFamily};
  }

  .exclude-range {
    fill: ${t.excludeBkgColor};
  }

  .section {
    stroke: none;
    opacity: 0.2;
  }

  .section0 {
    fill: ${t.sectionBkgColor};
  }

  .section2 {
    fill: ${t.sectionBkgColor2};
  }

  .section1,
  .section3 {
    fill: ${t.altSectionBkgColor};
    opacity: 0.2;
  }

  .sectionTitle0 {
    fill: ${t.titleColor};
  }

  .sectionTitle1 {
    fill: ${t.titleColor};
  }

  .sectionTitle2 {
    fill: ${t.titleColor};
  }

  .sectionTitle3 {
    fill: ${t.titleColor};
  }

  .sectionTitle {
    text-anchor: start;
    font-family: ${t.fontFamily};
  }


  /* Grid and axis */

  .grid .tick {
    stroke: ${t.gridColor};
    opacity: 0.8;
    shape-rendering: crispEdges;
  }

  .grid .tick text {
    font-family: ${t.fontFamily};
    fill: ${t.textColor};
  }

  .grid path {
    stroke-width: 0;
  }


  /* Today line */

  .today {
    fill: none;
    stroke: ${t.todayLineColor};
    stroke-width: 2px;
  }


  /* Task styling */

  /* Default task */

  .task {
    stroke-width: 2;
  }

  .taskText {
    text-anchor: middle;
    font-family: ${t.fontFamily};
  }

  .taskTextOutsideRight {
    fill: ${t.taskTextDarkColor};
    text-anchor: start;
    font-family: ${t.fontFamily};
  }

  .taskTextOutsideLeft {
    fill: ${t.taskTextDarkColor};
    text-anchor: end;
  }


  /* Special case clickable */

  .task.clickable {
    cursor: pointer;
  }

  .taskText.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideLeft.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideRight.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }


  /* Specific task settings for the sections*/

  .taskText0,
  .taskText1,
  .taskText2,
  .taskText3 {
    fill: ${t.taskTextColor};
  }

  .task0,
  .task1,
  .task2,
  .task3 {
    fill: ${t.taskBkgColor};
    stroke: ${t.taskBorderColor};
  }

  .taskTextOutside0,
  .taskTextOutside2
  {
    fill: ${t.taskTextOutsideColor};
  }

  .taskTextOutside1,
  .taskTextOutside3 {
    fill: ${t.taskTextOutsideColor};
  }


  /* Active task */

  .active0,
  .active1,
  .active2,
  .active3 {
    fill: ${t.activeTaskBkgColor};
    stroke: ${t.activeTaskBorderColor};
  }

  .activeText0,
  .activeText1,
  .activeText2,
  .activeText3 {
    fill: ${t.taskTextDarkColor} !important;
  }


  /* Completed task */

  .done0,
  .done1,
  .done2,
  .done3 {
    stroke: ${t.doneTaskBorderColor};
    fill: ${t.doneTaskBkgColor};
    stroke-width: 2;
  }

  .doneText0,
  .doneText1,
  .doneText2,
  .doneText3 {
    fill: ${t.taskTextDarkColor} !important;
  }


  /* Tasks on the critical line */

  .crit0,
  .crit1,
  .crit2,
  .crit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.critBkgColor};
    stroke-width: 2;
  }

  .activeCrit0,
  .activeCrit1,
  .activeCrit2,
  .activeCrit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.activeTaskBkgColor};
    stroke-width: 2;
  }

  .doneCrit0,
  .doneCrit1,
  .doneCrit2,
  .doneCrit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.doneTaskBkgColor};
    stroke-width: 2;
    cursor: pointer;
    shape-rendering: crispEdges;
  }

  .milestone {
    transform: rotate(45deg) scale(0.8,0.8);
  }

  .milestoneText {
    font-style: italic;
  }
  .doneCritText0,
  .doneCritText1,
  .doneCritText2,
  .doneCritText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  .activeCritText0,
  .activeCritText1,
  .activeCritText2,
  .activeCritText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  .titleText {
    text-anchor: middle;
    font-size: 18px;
    fill: ${t.titleColor||t.textColor};
    font-family: ${t.fontFamily};
  }
`,"getStyles"),mn=kn,gn={parser:Sr,db:ln,renderer:hn,styles:mn};export{gn as diagram};
