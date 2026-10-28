import test from "node:test";
import assert from "node:assert/strict";
import {newSupplyTwinPlan,supplyTwinModel,supplyTwinMarkup} from "../dist/supply-twin.js";

test("unknown supplies, zero supplies and an absent household remain distinct",()=>{
  const unknown=supplyTwinModel({people:3,water:null,food:null});
  assert.equal(unknown.first,null);assert.equal(unknown.plannedFirst,null);
  assert.equal(supplyTwinModel({people:3,water:0,food:0}).first,0);
  assert.equal(supplyTwinModel({people:0,water:18,food:3}).first,null);
  const withPlan=supplyTwinModel({people:3,water:null,food:3},{water:60,food:7});
  assert.equal(withPlan.first,null);assert.equal(withPlan.plannedFirst,null);
});

test("people scale existing quantities, not the amount actually stored",()=>{
  const normal=supplyTwinModel({people:3,water:18,food:3});
  const guests=supplyTwinModel({people:3,water:18,food:3},{guests:3});
  assert.equal(normal.first,3);assert.equal(guests.first,1.5);
  assert.equal(guests.water,18);assert.equal(guests.food,3);assert.equal(guests.dailyWater,12);
});

test("one-sided additions cannot bypass the other bottleneck; their combination can",()=>{
  const stock={people:3,water:18,food:3};
  assert.equal(supplyTwinModel(stock,{water:6}).plannedFirst,3);
  assert.equal(supplyTwinModel(stock,{food:1}).plannedFirst,3);
  assert.equal(supplyTwinModel(stock,{water:6,food:1}).plannedFirst,4);
  assert.equal(supplyTwinModel(stock).bottleneck,"both");
  assert.equal(supplyTwinModel(stock).waterGain,0);
});

test("a cooker outage needs an explicit food estimate and never assumes everything is ready",()=>{
  const stock={people:2,water:40,food:10};
  assert.equal(supplyTwinModel(stock,{scenario:"no-cook"}).first,null);
  assert.equal(supplyTwinModel(stock,{scenario:"no-cook",readyPercent:0}).first,0);
  assert.equal(supplyTwinModel(stock,{scenario:"no-cook",readyPercent:50}).first,5);
  assert.equal(supplyTwinModel(stock,{scenario:"no-cook",readyPercent:50,food:1}).plannedFirst,6);
});

test("goal planning balances both supplies for guests without shrinking an existing plan",()=>{
  const stock={people:3,water:18,food:3};
  const plan={...newSupplyTwinPlan(),guests:2,scenario:"no-cook",readyPercent:25};
  const goal=supplyTwinModel(stock,plan).toGoal;
  const result=supplyTwinModel(stock,{...plan,...goal});
  assert.ok(result.plannedFirst>=10);assert.equal(goal.water,82);
  assert.ok(supplyTwinModel(stock,{water:100,food:30}).toGoal.water>=100);
  assert.ok(supplyTwinModel(stock,{water:100,food:30}).toGoal.food>=30);
});

test("time travel reports leftovers without negative quantities or stock mutation",()=>{
  const stock=Object.freeze({people:3,water:18,food:3});
  const plan=Object.freeze({...newSupplyTwinPlan(),water:6,food:1,hour:48});
  const atDayTwo=supplyTwinModel(stock,plan);
  assert.equal(atDayTwo.waterRemaining,12);assert.equal(atDayTwo.foodRemaining,2);
  const afterEnd=supplyTwinModel(stock,{...plan,hour:240});
  assert.equal(afterEnd.waterRemaining,0);assert.equal(afterEnd.foodRemaining,0);
  assert.equal(stock.water,18);assert.equal(plan.water,6);
});

test("guest growth cannot increase coverage and extra supplies cannot reduce it",()=>{
  for(const people of [1,3,8])for(const water of [0,6,40])for(const food of [0,3,10]){
    const stock={people,water,food};const base=supplyTwinModel(stock);
    assert.ok(supplyTwinModel(stock,{guests:2}).first<=base.first);
    assert.ok(supplyTwinModel(stock,{water:6,food:1}).plannedFirst>=base.first);
  }
});

test("the widget explains its scope in both languages and renders unknowns honestly",()=>{
  const stock={people:2,water:null,food:null};
  const de=supplyTwinMarkup(stock,newSupplyTwinPlan(),"de");
  const en=supplyTwinMarkup(stock,newSupplyTwinPlan(),"en");
  assert.match(de,/Vorrats-Zeitmaschine/);assert.match(de,/Noch offen/);
  assert.match(de,/RedScore werden dadurch nicht verändert/);
  assert.match(en,/Supply Time Machine/);assert.match(en,/Not calculated yet/);
  assert.match(en,/not a prediction or safety guarantee/);
  assert.doesNotMatch(en,/Vorrats-Zeitmaschine|Haushaltstag Essen/);
});
