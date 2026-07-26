import { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput, Modal, ScrollView,
} from "react-native";
import Svg, { Polyline, Circle } from "react-native-svg";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bodyMeasurementApi } from "@/api/bodyMeasurementApi";

interface Measurement {
  measurementId?: number; date?: string; weight?: number;
  bodyFatPct?: number; parts?: Record<string, number>; notes?: string;
}

const BODY_PARTS = ["chest","waist","hips","arms","thighs","calves","shoulders","neck"];

function Sparkline({ data, w, h, c }: { data: number[]; w: number; h: number; c: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1;
  const pts = data.map((v,i) => `${(i/(data.length-1))*w},${h-((v-min)/rng)*h}`).join(" ");
  return (
    <Svg width={w} height={h}>
      <Polyline points={pts} fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx={(data.length-1)/Math.max(data.length-1,1)*w} cy={h-((data[data.length-1]-min)/rng)*h} r={3} fill={c} />
    </Svg>
  );
}

export function MeasurementsScreen() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [weight, setWeight] = useState(""), [bodyFat, setBodyFat] = useState("");
  const [notes, setNotes] = useState("");
  const [parts, setParts] = useState<Record<string,string>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["measurements"], queryFn: () => bodyMeasurementApi.getAll(),
  });
  const { data: latest } = useQuery({
    queryKey: ["latestMeasurement"], queryFn: () => bodyMeasurementApi.getLatest(),
  });

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: () => {
      const body: Record<string,unknown> = { date: new Date().toISOString().split("T")[0] };
      if (weight) body.weight = Number(weight);
      if (bodyFat) body.bodyFatPct = Number(bodyFat);
      if (notes.trim()) body.notes = notes.trim();
      const pv: Record<string,number> = {};
      Object.entries(parts).forEach(([k,v]) => { if (v) pv[k] = Number(v); });
      if (Object.keys(pv).length > 0) body.parts = pv;
      return bodyMeasurementApi.create(body);
    },
    onSuccess: () => {
      setShowAdd(false); setWeight(""); setBodyFat(""); setNotes(""); setParts({});
      qc.invalidateQueries({ queryKey: ["measurements"] });
      qc.invalidateQueries({ queryKey: ["latestMeasurement"] });
    },
  });

  const measurements: Measurement[] = (data as { measurements?: Measurement[] })?.measurements ?? [];
  const latestM = latest as Measurement | undefined;
  const wData = useMemo(() => [...measurements].reverse().map(m=>m.weight??0).filter(w=>w>0), [measurements]);

  const rItem = ({ item }: { item: Measurement }) => (
    <View style={s.card}>
      <View style={s.cardH}><Text style={s.cardD}>{item.date}</Text>
        <View style={s.mets}>{item.weight?<Text style={s.met}>{item.weight} kg</Text>:null}{item.bodyFatPct?<Text style={s.met}>{item.bodyFatPct}% BF</Text>:null}</View>
      </View>
      {item.parts&&Object.keys(item.parts).length>0&&<View style={s.pRow}>{Object.entries(item.parts).slice(0,4).map(([k,v])=><View key={k} style={s.pTag}><Text style={s.pTxt}>{k}: {v}cm</Text></View>)}</View>}
      {item.notes?<Text style={s.note} numberOfLines={2}>{item.notes}</Text>:null}
    </View>
  );

  return (
    <View style={s.f}>
      {isLoading?<View style={s.c}><ActivityIndicator size="large" color="#2563eb" /></View>
      :isError?<View style={s.c}><Text style={s.err}>Failed to load</Text><TouchableOpacity onPress={()=>refetch()} style={s.retry}><Text style={s.retryT}>Retry</Text></TouchableOpacity></View>
      :<FlatList data={measurements} keyExtractor={i=>String(i.measurementId??"")} renderItem={rItem}
          contentContainerStyle={s.list} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListHeaderComponent={<>
            {latestM&&<View style={s.sum}>
              <Text style={s.sumT}>Latest</Text>
              <View style={s.sumR}>
                {latestM.weight?<View style={s.sumI}><Text style={s.sumV}>{latestM.weight}</Text><Text style={s.sumL}>kg</Text></View>:null}
                {latestM.bodyFatPct!=null?<View style={s.sumI}><Text style={s.sumV}>{latestM.bodyFatPct}%</Text><Text style={s.sumL}>Body Fat</Text></View>:null}
              </View>
              <Text style={s.sumD}>{latestM.date}</Text>
              {latestM.parts&&Object.keys(latestM.parts).length>0&&<View style={s.pDet}>{Object.entries(latestM.parts).map(([k,v])=><View key={k} style={s.pR}><Text style={s.pL}>{k}</Text><View style={s.pB}><View style={[s.pF,{width:`${Math.min((v/150)*100,100)}%`}]}/></View><Text style={s.pV}>{v} cm</Text></View>)}</View>}
            </View>}
            {wData.length>=2&&<View style={s.chart}><Text style={s.chT}>Weight Trend</Text><Sparkline data={wData.slice(-14)} w={300} h={80} c="#2563eb" /></View>}
          </>}
          ListEmptyComponent={<View style={s.c}><Text style={s.empty}>No measurements yet</Text></View>}
        />}
      <TouchableOpacity style={s.fab} onPress={()=>setShowAdd(true)}><Text style={s.fabT}>+</Text></TouchableOpacity>
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={s.mOver}>
          <ScrollView contentContainerStyle={s.mCont}>
            <Text style={s.mTtl}>Record Measurement</Text>
            <Text style={s.lbl}>Weight (kg)</Text>
            <TextInput style={s.inp} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="75.0" placeholderTextColor="#9ca3af" />
            <Text style={s.lbl}>Body Fat %</Text>
            <TextInput style={s.inp} value={bodyFat} onChangeText={setBodyFat} keyboardType="numeric" placeholder="15.0" placeholderTextColor="#9ca3af" />
            <Text style={s.lbl}>Notes</Text>
            <TextInput style={[s.inp,s.ta]} value={notes} onChangeText={setNotes} placeholder="Optional..." placeholderTextColor="#9ca3af" multiline numberOfLines={2} textAlignVertical="top" />
            <Text style={s.lbl}>Body Parts (cm)</Text>
            <View style={s.pGrid}>{BODY_PARTS.map(p=><View key={p} style={s.pIR}><Text style={s.pIL}>{p}</Text><TextInput style={s.pI} value={parts[p]??""} onChangeText={v=>setParts(pr=>({...pr,[p]:v}))} keyboardType="numeric" placeholder="--" placeholderTextColor="#d1d5db" /></View>)}</View>
            <View style={s.mBtns}>
              <TouchableOpacity style={s.cBtn} onPress={()=>setShowAdd(false)}><Text style={s.cTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.sBtn} onPress={()=>create()} disabled={creating}>{creating?<ActivityIndicator color="#fff" size="small" />:<Text style={s.sTxt}>Save</Text>}</TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  f: { flex: 1, backgroundColor: "#f9fafb" },
  c: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  list: { padding: 16, gap: 12, paddingBottom: 80 },
  sum: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 0.5, borderColor: "#e5e7eb" },
  sumT: { fontSize: 13, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  sumR: { flexDirection: "row", gap: 24, marginBottom: 8 },
  sumI: { alignItems: "flex-start" },
  sumV: { fontSize: 32, fontWeight: "800", color: "#2563eb" },
  sumL: { fontSize: 12, fontWeight: "600", color: "#6b7280", marginTop: 2 },
  sumD: { fontSize: 13, color: "#9ca3af", marginTop: 4 },
  pDet: { marginTop: 16, gap: 8 },
  pR: { flexDirection: "row", alignItems: "center", gap: 10 },
  pL: { fontSize: 12, fontWeight: "600", color: "#6b7280", width: 70, textTransform: "capitalize" },
  pB: { flex: 1, height: 6, backgroundColor: "#e5e7eb", borderRadius: 3, overflow: "hidden" },
  pF: { height: "100%", backgroundColor: "#2563eb", borderRadius: 3 },
  pV: { fontSize: 12, fontWeight: "600", color: "#111827", width: 50, textAlign: "right" },
  chart: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, alignItems: "center" },
  chT: { fontSize: 13, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: "#e5e7eb" },
  cardH: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardD: { fontSize: 14, fontWeight: "600", color: "#111827" },
  mets: { flexDirection: "row", gap: 12 },
  met: { fontSize: 13, fontWeight: "700", color: "#2563eb" },
  pRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  pTag: { backgroundColor: "#f3f4f6", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  pTxt: { fontSize: 11, color: "#6b7280" },
  note: { fontSize: 12, color: "#9ca3af", marginTop: 6 },
  empty: { fontSize: 15, color: "#6b7280" },
  err: { fontSize: 15, color: "#ef4444", marginBottom: 12 },
  retry: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#2563eb", borderRadius: 8 },
  retryT: { color: "#fff", fontWeight: "600" },
  fab: { position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center", elevation: 6 },
  fabT: { color: "#fff", fontSize: 28, fontWeight: "300", lineHeight: 30 },
  mOver: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  mCont: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, gap: 10 },
  mTtl: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 6 },
  lbl: { fontSize: 12, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  inp: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#111827" },
  ta: { minHeight: 50, paddingTop: 10 },
  pGrid: { gap: 8 },
  pIR: { flexDirection: "row", alignItems: "center", gap: 10 },
  pIL: { fontSize: 13, fontWeight: "600", color: "#374151", width: 80, textTransform: "capitalize" },
  pI: { flex: 1, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: "#111827" },
  mBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  cBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", alignItems: "center" },
  cTxt: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  sBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center" },
  sTxt: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
